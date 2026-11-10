import { NextResponse } from "next/server";
import { HTTP_STATUS, type ApiError, type ErrorCode } from "@/shared/contracts";

export class AppError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
  }
  get status(): number {
    return HTTP_STATUS[this.code];
  }
}

export function errorBody(code: ErrorCode, message: string): ApiError {
  return { error: { code, message } };
}

/** Maps any thrown value to a contract-shaped JSON response. */
export function toErrorResponse(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json(errorBody(err.code, err.message), {
      status: err.status,
    });
  }
  console.error("Unhandled error", err);
  return NextResponse.json(
    errorBody("INTERNAL_ERROR", "Internal server error"),
    { status: HTTP_STATUS.INTERNAL_ERROR },
  );
}
