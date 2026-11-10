import { z } from "zod";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "FILE_TOO_LARGE",
  "NOT_FOUND",
  "EXPIRED",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FILE_TOO_LARGE: 413,
  NOT_FOUND: 404,
  EXPIRED: 410,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};
