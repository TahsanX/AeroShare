import { apiErrorSchema } from "@/shared/contracts/errors";
import {
  downloadResponseSchema,
  fileMetaSchema,
  type FileMeta,
} from "@/shared/contracts/files";

export type DownloadFailure =
  | { kind: "not-found" }
  | { kind: "expired" }
  | { kind: "rate-limited"; retryAfterSeconds: number }
  | { kind: "error"; message: string };

const DEFAULT_RETRY_SECONDS = 30;

/** Parse a Retry-After header value (seconds) into a positive integer. */
export function parseRetryAfter(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : DEFAULT_RETRY_SECONDS;
}

/** Map an API error response (status + parsed body + header) to a UI failure. */
export function mapApiFailure(
  status: number,
  body: unknown,
  retryAfter?: string | null,
): DownloadFailure {
  const parsed = apiErrorSchema.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : undefined;
  if (code === "NOT_FOUND" || status === 404) return { kind: "not-found" };
  if (code === "EXPIRED" || status === 410) return { kind: "expired" };
  if (code === "RATE_LIMITED" || status === 429) {
    return { kind: "rate-limited", retryAfterSeconds: parseRetryAfter(retryAfter) };
  }
  return {
    kind: "error",
    message: parsed.success ? parsed.data.error.message : "Something went wrong.",
  };
}

export class DownloadError extends Error {
  constructor(public readonly failure: DownloadFailure) {
    super(failure.kind === "error" ? failure.message : failure.kind);
    this.name = "DownloadError";
  }
}

async function request<T>(
  url: string,
  schema: { parse: (v: unknown) => T },
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new DownloadError({ kind: "error", message: "Network error. Check your connection." });
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    throw new DownloadError(mapApiFailure(res.status, body, res.headers.get("Retry-After")));
  }
  try {
    return schema.parse(body);
  } catch {
    throw new DownloadError({ kind: "error", message: "Unexpected response from server." });
  }
}

export function fetchFileMeta(code: string, signal?: AbortSignal): Promise<FileMeta> {
  return request(`/api/files/${encodeURIComponent(code)}`, fileMetaSchema, signal);
}

export function fetchDownloadUrl(code: string) {
  return request(`/api/files/${encodeURIComponent(code)}/download`, downloadResponseSchema);
}

/** Trigger a browser download via a temporary anchor. */
export function triggerBrowserDownload(url: string, name: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
