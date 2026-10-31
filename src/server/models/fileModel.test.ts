import { beforeEach, describe, expect, it, vi } from "vitest";

const insertSingle = vi.fn();
const rpc = vi.fn();
const builder: Record<string, unknown> = {};
for (const m of ["insert", "select", "eq", "lt", "neq", "order", "limit", "update", "delete"]) {
  builder[m] = vi.fn(() => builder);
}
builder.single = insertSingle;
builder.maybeSingle = vi.fn();
const from = vi.fn(() => builder);

vi.mock("@/server/services/supabaseClient", () => ({
  getSupabase: () => ({ from, rpc }),
}));

import * as fileModel from "./fileModel";

const row: fileModel.FileRow = {
  id: "uuid-1",
  short_code: "Ab3dE9xZ",
  original_name: "a.txt",
  size_bytes: 10,
  mime_type: "text/plain",
  storage_path: "Ab3dE9xZ/a.txt",
  upload_id: null,
  status: "pending",
  download_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  expires_at: "2026-01-08T00:00:00Z",
};

const input = {
  name: "a.txt",
  size: 10,
  mime: "text/plain",
  storagePath: "p",
  expiresAt: new Date("2026-01-08T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  insertSingle.mockReset();
});

describe("fileModel", () => {
  it("maps row to record and meta", () => {
    const rec = fileModel.rowToRecord(row);
    expect(rec.code).toBe("Ab3dE9xZ");
    expect(fileModel.recordToMeta(rec)).toEqual({
      code: "Ab3dE9xZ",
      name: "a.txt",
      size: 10,
      mime: "text/plain",
      expiresAt: row.expires_at,
    });
  });

  it("retries on short_code collision", async () => {
    insertSingle
      .mockResolvedValueOnce({ data: null, error: { code: "23505", message: "dup" } })
      .mockResolvedValueOnce({ data: row, error: null });
    const makeCode = vi.fn().mockReturnValueOnce("aaaaaaaa").mockReturnValueOnce("bbbbbbbb");
    const rec = await fileModel.create(input, makeCode);
    expect(rec.id).toBe("uuid-1");
    expect(makeCode).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 collisions", async () => {
    insertSingle.mockResolvedValue({ data: null, error: { code: "23505", message: "dup" } });
    await expect(fileModel.create(input, () => "x")).rejects.toThrow(/collision/);
    expect(insertSingle).toHaveBeenCalledTimes(3);
  });

  it("does not retry on other errors", async () => {
    insertSingle.mockResolvedValue({ data: null, error: { code: "XX", message: "boom" } });
    await expect(fileModel.create(input, () => "x")).rejects.toThrow(/boom/);
    expect(insertSingle).toHaveBeenCalledTimes(1);
  });

  it("incrementDownload calls rpc", async () => {
    rpc.mockResolvedValue({ error: null });
    await fileModel.incrementDownload("Ab3dE9xZ");
    expect(rpc).toHaveBeenCalledWith("increment_download_count", { p_code: "Ab3dE9xZ" });
  });
});
