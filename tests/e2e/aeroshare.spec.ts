import { mkdir, readFile, truncate, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { CodeTracker, codeFromShareUrl, expireFile } from "./helpers/backend";
import { randomFile, sha256 } from "./helpers/files";

test.describe.configure({ mode: "serial" });

const tracker = new CodeTracker();
test.afterEach(async () => {
  await tracker.cleanup();
});

async function uploadViaUi(page: Page, name: string, buffer: Buffer) {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: "application/octet-stream", buffer });
  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  const link = page.getByLabel("Share link");
  await expect(link).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Your link is ready")).toBeVisible();
  const shareUrl = await link.inputValue();
  tracker.add(codeFromShareUrl(shareUrl));
  return shareUrl;
}

/** Opens the share link in a fresh browser context and downloads the file. */
async function downloadInFreshContext(browser: Browser, shareUrl: string, name: string) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await ctx.newPage();
    await page.goto(shareUrl);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(name);
    return { page, bytes: await readFile(await download.path()) };
  } finally {
    await ctx.close();
  }
}

test("uploads a small file and downloads identical bytes in a new context", async ({
  page,
  browser,
}) => {
  const data = randomFile(100 * 1024);
  const name = "small-e2e.bin";
  const shareUrl = await uploadViaUi(page, name, data);

  const ctx = await browser.newContext({ acceptDownloads: true });
  const other = await ctx.newPage();
  await other.goto(shareUrl);
  await expect(other.getByRole("heading", { name })).toBeVisible();
  await expect(other.getByText(/100(\.0+)? KB/)).toBeVisible();
  const dl = other.waitForEvent("download");
  await other.getByRole("button", { name: "Download" }).click();
  const bytes = await readFile(await (await dl).path());
  await ctx.close();
  expect(bytes.equals(data)).toBe(true);
});

test("multipart upload goes straight to Supabase storage and round-trips (SHA-256)", async ({
  page,
  browser,
}) => {
  const data = randomFile(12 * 1024 * 1024);
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host.split(".")[0];
  const putHosts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "PUT") putHosts.push(new URL(req.url()).host);
  });

  const name = "multipart-e2e.bin";
  const shareUrl = await uploadViaUi(page, name, data);

  expect(putHosts.length).toBeGreaterThanOrEqual(2); // 12MB -> 2 parts of 8MB
  for (const host of putHosts) {
    // Storage lives on <ref>.storage.supabase.co (or the project host itself).
    expect(host.startsWith(projectRef)).toBe(true);
    expect(host.endsWith(".supabase.co")).toBe(true);
    expect(host).not.toContain("localhost");
  }

  const { bytes } = await downloadInFreshContext(browser, shareUrl, name);
  expect(bytes.length).toBe(data.length);
  expect(sha256(bytes)).toBe(sha256(data));
});

test("rejects a file larger than 50MB with a visible error", async ({ page }, testInfo) => {
  // Sparse file on disk: 50MB + 1 byte without holding it in memory.
  const huge = testInfo.outputPath("huge.bin");
  await mkdir(dirname(huge), { recursive: true });
  await writeFile(huge, "");
  await truncate(huge, 50 * 1024 * 1024 + 1);

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(huge);
  await expect(page.getByRole("alert").filter({ hasText: "huge.bin" })).toContainText(
    /maximum file size/i,
  );
  await expect(page.getByRole("button", { name: "Upload", exact: true })).toHaveCount(0);
});

test("API rejects init for size over 50MB", async ({ request }) => {
  const res = await request.post("/api/uploads/init", {
    data: { name: "x.bin", size: 52428801 },
  });
  expect(res.status()).toBe(413);
});

test("unknown share code shows the not-found state", async ({ page }) => {
  await page.goto("/s/ZZZZZZZZ");
  await expect(page.getByRole("heading", { name: "File not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Upload a file" })).toBeVisible();
});

test("theme toggle switches dark and light", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitem", { name: "Light" }).click();
  await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
});

test("expired file returns 410; cleanup with wrong secret returns 401", async ({ request }) => {
  const bytes = randomFile(2048);
  const init = await request.post("/api/uploads/init", {
    data: { name: "expire-e2e.bin", size: bytes.length, mime: "application/octet-stream" },
  });
  expect(init.status()).toBe(200);
  const body = await init.json();
  expect(body.mode).toBe("single");
  tracker.add(body.code);

  const put = await fetch(body.uploadUrl, { method: "PUT", body: new Uint8Array(bytes) });
  expect(put.ok).toBe(true);
  const complete = await request.post("/api/uploads/complete", { data: { code: body.code } });
  expect(complete.status()).toBe(200);

  expect((await request.get(`/api/files/${body.code}`)).status()).toBe(200);

  await expireFile(body.code);
  expect((await request.get(`/api/files/${body.code}`)).status()).toBe(410);
  expect((await request.get(`/api/files/${body.code}/download`)).status()).toBe(410);

  const cleanup = await request.post("/api/cron/cleanup", {
    headers: { Authorization: "Bearer definitely-wrong-secret" },
  });
  expect(cleanup.status()).toBe(401);
});
