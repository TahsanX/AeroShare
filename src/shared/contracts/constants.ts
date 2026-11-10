export const MB = 1024 * 1024;

/** Hard upload limit enforced on client, API and DB. */
export const MAX_FILE_SIZE = 50 * MB;

/** Files above this size use multipart upload. */
export const MULTIPART_THRESHOLD = 5 * MB;

/** Multipart part size (S3 minimum is 5MB, except the last part). */
export const PART_SIZE = 8 * MB;

export const MAX_PARTS = Math.ceil(MAX_FILE_SIZE / PART_SIZE);

export const EXPIRY_OPTIONS = {
  "1d": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
} as const;

export type ExpiryOption = keyof typeof EXPIRY_OPTIONS;

export const DEFAULT_EXPIRY: ExpiryOption = "7d";

export const SHORT_CODE_LENGTH = 8;
