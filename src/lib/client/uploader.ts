import {
  MAX_FILE_SIZE,
  apiErrorSchema,
  completeUploadResponseSchema,
  initUploadResponseSchema,
  type CompleteUploadResponse,
  type ErrorCode,
  type ExpiryOption,
  type InitUploadRequest,
  type InitUploadResponse,
} from "@/shared/contracts";
import { formatBytes } from "./format";

export const PART_CONCURRENCY = 3;
export const PART_MAX_RETRIES = 3;

export type UploadErrorCode = ErrorCode | "ABORTED" | "NETWORK_ERROR";

export class UploadError extends Error {
  readonly code: UploadErrorCode;
  /** Seconds to wait before retrying (RATE_LIMITED). */
  readonly retryAfter?: number;
  /** HTTP status of the failing request, when known. */
  readonly status?: number;

  constructor(
    code: UploadErrorCode,
    message: string,
    opts: { retryAfter?: number; status?: number } = {},
  ) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.retryAfter = opts.retryAfter;
    this.status = opts.status;
  }
}

export interface UploadOptions {
  expiresIn?: ExpiryOption;
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
  /** Test seams. */
  fetchImpl?: typeof fetch;
  xhrFactory?: () => XMLHttpRequest;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

interface Deps {
  fetchImpl: typeof fetch;
  xhrFactory: () => XMLHttpRequest;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const abortedError = () => new UploadError("ABORTED", "Upload cancelled.");

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortedError();
}

export function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortedError());
    const onAbort = () => {
      clearTimeout(t);
      reject(abortedError());
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Exponential backoff with full jitter: attempt 0 -> up to 500ms, 1 -> 1s, ... */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  return Math.round(random() * 500 * 2 ** attempt);
}

async function toApiError(res: Response): Promise<UploadError> {
  const retryHeader = res.headers.get("Retry-After");
  const retryAfter =
    retryHeader && Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : undefined;
  let code: UploadErrorCode = res.status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR";
  let message = `Request failed (${res.status}).`;
  try {
    const parsed = apiErrorSchema.safeParse(await res.json());
    if (parsed.success) {
      code = parsed.data.error.code;
      message = parsed.data.error.message;
    }
  } catch {
    /* non-JSON body */
  }
  if (code === "RATE_LIMITED") {
    message = retryAfter
      ? `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`
      : "Too many requests. Please try again shortly.";
  }
  return new UploadError(code, message, { retryAfter, status: res.status });
}

async function postJson(
  deps: Deps,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await deps.fetchImpl(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (signal?.aborted) throw abortedError();
    throw new UploadError("NETWORK_ERROR", "Network error. Check your connection and try again.");
  }
  if (!res.ok) throw await toApiError(res);
  try {
    return await res.json();
  } catch {
    throw new UploadError("INTERNAL_ERROR", "Unexpected server response.");
  }
}

/** PUT a blob via XHR so we get real byte-level progress. */
function putBlob(
  deps: Deps,
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  onBytes: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortedError());
    const xhr = deps.xhrFactory();
    const onAbort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(Math.min(e.loaded, blob.size));
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onBytes(blob.size);
        resolve();
      } else {
        reject(
          new UploadError("INTERNAL_ERROR", `Storage upload failed (${xhr.status}).`, {
            status: xhr.status,
          }),
        );
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new UploadError("NETWORK_ERROR", "Network error during upload.", { status: 0 }));
    };
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => {
      cleanup();
      reject(abortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    xhr.send(blob);
  });
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof UploadError)) return false;
  if (err.code === "NETWORK_ERROR") return true;
  return err.status !== undefined && err.status >= 500;
}

async function putPartWithRetry(
  deps: Deps,
  url: string,
  blob: Blob,
  signal: AbortSignal | undefined,
  onBytes: (loaded: number) => void,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      onBytes(0);
      await putBlob(deps, url, blob, signal, onBytes);
      return;
    } catch (err) {
      if (!isRetryable(err) || attempt >= PART_MAX_RETRIES) throw err;
      await deps.sleep(backoffDelay(attempt), signal);
    }
  }
}

async function uploadParts(
  deps: Deps,
  file: File,
  init: Extract<InitUploadResponse, { mode: "multipart" }>,
  signal: AbortSignal | undefined,
  report: (loaded: number) => void,
): Promise<void> {
  const parts = [...init.parts].sort((a, b) => a.partNumber - b.partNumber);
  const perPart = new Map<number, number>();
  const update = (n: number, loaded: number) => {
    perPart.set(n, loaded);
    let sum = 0;
    for (const v of perPart.values()) sum += v;
    report(sum);
  };

  // Internal controller so one failing part stops the others.
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) ctrl.abort();

  let next = 0;
  let firstError: unknown;
  const worker = async () => {
    while (!ctrl.signal.aborted) {
      const idx = next++;
      if (idx >= parts.length) return;
      const { partNumber, url } = parts[idx];
      const start = (partNumber - 1) * init.partSize;
      const blob = file.slice(start, Math.min(start + init.partSize, file.size));
      try {
        await putPartWithRetry(deps, url, blob, ctrl.signal, (l) => update(partNumber, l));
      } catch (err) {
        if (firstError === undefined) firstError = err;
        ctrl.abort();
        return;
      }
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, parts.length) }, worker),
    );
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
  if (firstError !== undefined) throw firstError;
  throwIfAborted(signal);
}

export async function uploadFile(
  file: File,
  options: UploadOptions = {},
): Promise<CompleteUploadResponse> {
  const { signal, onProgress, expiresIn } = options;
  const deps: Deps = {
    fetchImpl: options.fetchImpl ?? ((...a) => globalThis.fetch(...a)),
    xhrFactory: options.xhrFactory ?? (() => new XMLHttpRequest()),
    sleep: options.sleep ?? defaultSleep,
  };

  if (file.size <= 0) {
    throw new UploadError("VALIDATION_ERROR", "This file is empty.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      "FILE_TOO_LARGE",
      `File is too large. The maximum size is ${formatBytes(MAX_FILE_SIZE)}.`,
    );
  }
  throwIfAborted(signal);

  const total = file.size;
  const report = (loaded: number) => onProgress?.(Math.min(loaded, total), total);

  const body: InitUploadRequest = {
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
    ...(expiresIn ? { expiresIn } : {}),
  };
  const initJson = await postJson(deps, "/api/uploads/init", body, signal);
  const parsedInit = initUploadResponseSchema.safeParse(initJson);
  if (!parsedInit.success) {
    throw new UploadError("INTERNAL_ERROR", "Unexpected server response.");
  }
  const init = parsedInit.data;

  const abortBestEffort = async () => {
    try {
      await deps.fetchImpl("/api/uploads/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: init.code }),
        keepalive: true,
      });
    } catch {
      /* best effort */
    }
  };

  try {
    report(0);
    if (init.mode === "single") {
      await putBlob(deps, init.uploadUrl, file, signal, report);
    } else {
      await uploadParts(deps, file, init, signal, report);
    }
    throwIfAborted(signal);
    // No signal here: once all bytes are uploaded, let completion finish.
    const done = completeUploadResponseSchema.safeParse(
      await postJson(deps, "/api/uploads/complete", { code: init.code }),
    );
    if (!done.success) throw new UploadError("INTERNAL_ERROR", "Unexpected server response.");
    report(total);
    return done.data;
  } catch (err) {
    await abortBestEffort();
    throw err;
  }
}
