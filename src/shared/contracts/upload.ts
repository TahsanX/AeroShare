import { z } from "zod";
import { EXPIRY_OPTIONS, MAX_FILE_SIZE } from "./constants";

export const initUploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  mime: z.string().max(255).default("application/octet-stream"),
  expiresIn: z.enum(Object.keys(EXPIRY_OPTIONS) as ["1d", "7d"]).default("7d"),
});
export type InitUploadRequest = z.input<typeof initUploadRequestSchema>;

const singleUploadSchema = z.object({
  mode: z.literal("single"),
  code: z.string(),
  /** Presigned URL; the client PUTs the whole file here. */
  uploadUrl: z.string().url(),
});

const multipartUploadSchema = z.object({
  mode: z.literal("multipart"),
  code: z.string(),
  uploadId: z.string(),
  partSize: z.number().int().positive(),
  /** One presigned PUT URL per part, partNumber starts at 1. */
  parts: z.array(
    z.object({ partNumber: z.number().int().positive(), url: z.string().url() }),
  ),
});

export const initUploadResponseSchema = z.discriminatedUnion("mode", [
  singleUploadSchema,
  multipartUploadSchema,
]);
export type InitUploadResponse = z.infer<typeof initUploadResponseSchema>;

export const completeUploadRequestSchema = z.object({ code: z.string().min(1) });
export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>;

export const abortUploadRequestSchema = completeUploadRequestSchema;
export type AbortUploadRequest = CompleteUploadRequest;

export const completeUploadResponseSchema = z.object({
  code: z.string(),
  /** Path of the share page, e.g. /s/Ab3dE9xZ. */
  sharePath: z.string(),
  expiresAt: z.string(),
});
export type CompleteUploadResponse = z.infer<typeof completeUploadResponseSchema>;
