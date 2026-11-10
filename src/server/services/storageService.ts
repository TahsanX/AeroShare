import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListMultipartUploadsCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getBucketName, getSupabase } from "./supabaseClient";

let s3: S3Client | undefined;

export function getS3(): S3Client {
  if (!s3) {
    const env = getEnv();
    s3 = new S3Client({
      endpoint: env.SUPABASE_S3_ENDPOINT,
      region: env.SUPABASE_S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID,
        secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

function bucket() {
  return getSupabase().storage.from(getBucketName());
}

export type SignedUpload = { url: string; token: string; path: string };

/** Single-request upload: client PUTs the whole file to `url`. */
export async function createSignedUploadUrl(path: string): Promise<SignedUpload> {
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) {
    throw new AppError("INTERNAL_ERROR", `Signed upload URL failed: ${error?.message}`);
  }
  return { url: data.signedUrl, token: data.token, path: data.path };
}

export async function createSignedDownloadUrl(
  path: string,
  ttlSec: number,
  downloadName?: string,
): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(
    path,
    ttlSec,
    downloadName ? { download: downloadName } : undefined,
  );
  if (error || !data) {
    throw new AppError("INTERNAL_ERROR", `Signed download URL failed: ${error?.message}`);
  }
  return data.signedUrl;
}

export async function objectExists(path: string): Promise<boolean> {
  const { data, error } = await bucket().exists(path);
  if (error) return false;
  return Boolean(data);
}

export async function deleteObject(path: string): Promise<void> {
  const { error } = await bucket().remove([path]);
  if (error) {
    throw new AppError("INTERNAL_ERROR", `Delete failed: ${error.message}`);
  }
}

// ---------- Multipart (S3 protocol) ----------

export async function createMultipart(path: string, mime: string): Promise<string> {
  const res = await getS3().send(
    new CreateMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: path,
      ContentType: mime,
    }),
  );
  if (!res.UploadId) throw new AppError("INTERNAL_ERROR", "No uploadId returned");
  return res.UploadId;
}

export async function presignParts(
  path: string,
  uploadId: string,
  partCount: number,
  ttl: number,
): Promise<{ partNumber: number; url: string }[]> {
  const client = getS3();
  return Promise.all(
    Array.from({ length: partCount }, async (_, i) => {
      const partNumber = i + 1;
      const url = await getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: getBucketName(),
          Key: path,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: ttl },
      );
      return { partNumber, url };
    }),
  );
}

async function listAllParts(path: string, uploadId: string): Promise<CompletedPart[]> {
  const parts: CompletedPart[] = [];
  let marker: string | undefined;
  for (;;) {
    const res = await getS3().send(
      new ListPartsCommand({
        Bucket: getBucketName(),
        Key: path,
        UploadId: uploadId,
        PartNumberMarker: marker,
      }),
    );
    for (const p of res.Parts ?? []) {
      parts.push({ PartNumber: p.PartNumber, ETag: p.ETag });
    }
    if (!res.IsTruncated || !res.NextPartNumberMarker) break;
    marker = res.NextPartNumberMarker;
  }
  return parts.sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0));
}

/** Completes using ETags discovered via ListParts (client need not send them). */
export async function completeMultipart(path: string, uploadId: string): Promise<void> {
  const parts = await listAllParts(path, uploadId);
  if (parts.length === 0) {
    throw new AppError("VALIDATION_ERROR", "No uploaded parts found");
  }
  await getS3().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: path,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipart(path: string, uploadId: string): Promise<void> {
  await getS3().send(
    new AbortMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: path,
      UploadId: uploadId,
    }),
  );
}

export type StaleMultipart = { path: string; uploadId: string; initiated?: Date };

/** In-progress multipart uploads older than `olderThanMs` (default 24h). */
export async function listStaleMultipart(
  olderThanMs = 24 * 60 * 60 * 1000,
): Promise<StaleMultipart[]> {
  const cutoff = Date.now() - olderThanMs;
  const out: StaleMultipart[] = [];
  let keyMarker: string | undefined;
  let uploadIdMarker: string | undefined;
  for (;;) {
    const res = await getS3().send(
      new ListMultipartUploadsCommand({
        Bucket: getBucketName(),
        KeyMarker: keyMarker,
        UploadIdMarker: uploadIdMarker,
      }),
    );
    for (const u of res.Uploads ?? []) {
      if (!u.Key || !u.UploadId) continue;
      if (u.Initiated && u.Initiated.getTime() > cutoff) continue;
      out.push({ path: u.Key, uploadId: u.UploadId, initiated: u.Initiated });
    }
    if (!res.IsTruncated) break;
    keyMarker = res.NextKeyMarker;
    uploadIdMarker = res.NextUploadIdMarker;
  }
  return out;
}
