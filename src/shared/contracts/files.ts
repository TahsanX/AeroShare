import { z } from "zod";

export const fileMetaSchema = z.object({
  code: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  mime: z.string(),
  expiresAt: z.string(),
});
export type FileMeta = z.infer<typeof fileMetaSchema>;

export const downloadResponseSchema = z.object({
  url: z.string().url(),
  name: z.string(),
});
export type DownloadResponse = z.infer<typeof downloadResponseSchema>;
