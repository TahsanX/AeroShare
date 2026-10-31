import { describe, expect, it, vi } from "vitest";
import { MAX_FILE_SIZE } from "@/shared/contracts";
import { UploadError, backoffDelay, uploadFile } from "./uploader";

type Handler = (xhr: FakeXhr) => void;

class FakeXhr {
  static instances: FakeXhr[] = [];
  static handler: Handler = (x) => x.succeed();
  status = 0;
  url = "";
  sent: Blob | null = null;
  upload: { onprogress: ((e: unknown) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeXhr.instances.push(this);
  }
  open(_m: string, url: string) {
    this.url = url;
  }
  send(blob: Blob) {
    this.sent = blob;
    queueMicrotask(() => FakeXhr.handler(this));
  }
  abort() {
    this.onabort?.();
  }
  progress(loaded: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded });
  }
  succeed() {
    this.progress(this.sent!.size);
    this.status = 200;
    this.onload?.();
  }
  fail(status: number) {
    this.status = status;
    this.onload?.();
  }
  netError() {
    this.onerror?.();
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function setup(initBody: unknown, opts: { complete?: Response } = {}) {
  FakeXhr.instances = [];
  FakeXhr.handler = (x) => x.succeed();
  const calls: { url: string; body: unknown }[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (u.endsWith("/init")) return initBody instanceof Response ? initBody : json(initBody);
    if (u.endsWith("/complete"))
      return (
        opts.complete ??
        json({ code: "Ab3dE9xZ", sharePath: "/s/Ab3dE9xZ", expiresAt: "2030-01-01T00:00:00Z" })
      );
    return json({ ok: true });
  });
  return {
    calls,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    xhrFactory: () => new FakeXhr() as unknown as XMLHttpRequest,
    sleep: vi.fn(async () => {}),
  };
}

const file = (size: number, name = "a.bin") => new File([new Uint8Array(size)], name);

describe("uploadFile", () => {
  it("rejects oversize files before any request", async () => {
    const s = setup({});
    const big = { size: MAX_FILE_SIZE + 1, name: "x", type: "" } as File;
    await expect(uploadFile(big, s)).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    expect(s.calls).toHaveLength(0);
  });

  it("does single upload with progress and complete", async () => {
    const s = setup({ mode: "single", code: "Ab3dE9xZ", uploadUrl: "https://s3.test/put" });
    const progress: number[] = [];
    const res = await uploadFile(file(100), {
      ...s,
      expiresIn: "1d",
      onProgress: (l) => progress.push(l),
    });
    expect(res.sharePath).toBe("/s/Ab3dE9xZ");
    expect(s.calls[0].body).toMatchObject({ name: "a.bin", size: 100, expiresIn: "1d" });
    expect(FakeXhr.instances[0].url).toBe("https://s3.test/put");
    expect(progress.at(-1)).toBe(100);
    expect(s.calls.map((c) => c.url)).toEqual(["/api/uploads/init", "/api/uploads/complete"]);
  });

  it("slices multipart parts and aggregates progress", async () => {
    const parts = [1, 2, 3].map((n) => ({ partNumber: n, url: `https://s3.test/p${n}` }));
    const s = setup({ mode: "multipart", code: "c", uploadId: "u", partSize: 40, parts });
    const progress: number[] = [];
    await uploadFile(file(100), { ...s, onProgress: (l) => progress.push(l) });
    const sizes = Object.fromEntries(FakeXhr.instances.map((x) => [x.url, x.sent!.size]));
    expect(sizes).toEqual({
      "https://s3.test/p1": 40,
      "https://s3.test/p2": 40,
      "https://s3.test/p3": 20,
    });
    expect(Math.max(...progress)).toBe(100);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });

  it("retries a failing part then succeeds", async () => {
    const parts = [{ partNumber: 1, url: "https://s3.test/p1" }];
    const s = setup({ mode: "multipart", code: "c", uploadId: "u", partSize: 40, parts });
    let n = 0;
    FakeXhr.handler = (x) => (n++ < 2 ? x.fail(503) : x.succeed());
    const orig = FakeXhr.handler;
    await uploadFile(file(30), s);
    FakeXhr.handler = orig;
    expect(FakeXhr.instances).toHaveLength(3);
    expect(s.sleep).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 retries and aborts", async () => {
    const parts = [{ partNumber: 1, url: "https://s3.test/p1" }];
    const s = setup({ mode: "multipart", code: "c", uploadId: "u", partSize: 40, parts });
    const run = uploadFile(file(30), s);
    FakeXhr.handler = (x) => x.fail(500);
    await expect(run).rejects.toBeInstanceOf(UploadError);
    expect(FakeXhr.instances).toHaveLength(4);
    expect(s.calls.at(-1)!.url).toBe("/api/uploads/abort");
  });

  it("does not retry 4xx part errors", async () => {
    const parts = [{ partNumber: 1, url: "https://s3.test/p1" }];
    const s = setup({ mode: "multipart", code: "c", uploadId: "u", partSize: 40, parts });
    const run = uploadFile(file(30), s);
    FakeXhr.handler = (x) => x.fail(403);
    await expect(run).rejects.toMatchObject({ status: 403 });
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it("limits concurrency to 3", async () => {
    const parts = [1, 2, 3, 4, 5].map((n) => ({ partNumber: n, url: `https://s3.test/p${n}` }));
    const s = setup({ mode: "multipart", code: "c", uploadId: "u", partSize: 10, parts });
    let active = 0;
    let peak = 0;
    FakeXhr.handler = (x) => {
      active++;
      peak = Math.max(peak, active);
      setTimeout(() => {
        active--;
        x.succeed();
      }, 5);
    };
    await uploadFile(file(50), s);
    expect(peak).toBe(3);
  });

  it("calls abort on cancel", async () => {
    const s = setup({ mode: "single", code: "c", uploadUrl: "https://s3.test/put" });
    const ctrl = new AbortController();
    FakeXhr.handler = () => ctrl.abort();
    await expect(uploadFile(file(10), { ...s, signal: ctrl.signal })).rejects.toMatchObject({
      code: "ABORTED",
    });
    expect(s.calls.at(-1)!.url).toBe("/api/uploads/abort");
    expect(s.calls.at(-1)!.body).toEqual({ code: "c" });
  });

  it("surfaces RATE_LIMITED with Retry-After", async () => {
    const s = setup(
      json({ error: { code: "RATE_LIMITED", message: "slow" } }, 429, { "Retry-After": "30" }),
    );
    await expect(uploadFile(file(10), s)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfter: 30,
    });
    // init failed: nothing to abort
    expect(s.calls.map((c) => c.url)).toEqual(["/api/uploads/init"]);
  });
});

describe("backoffDelay", () => {
  it("grows exponentially with jitter", () => {
    expect(backoffDelay(0, () => 1)).toBe(500);
    expect(backoffDelay(2, () => 1)).toBe(2000);
    expect(backoffDelay(1, () => 0)).toBe(0);
  });
});
