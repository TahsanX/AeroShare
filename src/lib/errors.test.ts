import { describe, expect, it, vi } from "vitest";
import { apiErrorSchema } from "@/shared/contracts";
import { AppError, toErrorResponse } from "./errors";

describe("errors", () => {
  it("maps AppError to status + contract body", async () => {
    const res = toErrorResponse(new AppError("NOT_FOUND", "nope"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(apiErrorSchema.parse(body).error.message).toBe("nope");
  });
  it("hides unknown errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = toErrorResponse(new Error("secret"));
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).not.toContain("secret");
  });
});
