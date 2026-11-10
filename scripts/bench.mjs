// Real benchmarks against this project's live backend (Supabase Storage + Postgres,
// Upstash Redis). Run with: node --env-file=.env scripts/bench.mjs
// Everything it creates (DB rows, storage objects, multipart uploads) is cleaned up
// at the end of each section.

import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes, randomUUID } from "node:crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const BUCKET = process.env.SUPABASE_BUCKET ?? "uploads";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const s3 = new S3Client({
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  region: process.env.SUPABASE_S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
  },
});

const ms = (a, b) => Number(b - a) / 1e6;
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const section = (title) => console.log(`\n=== ${title} ===`);

// ---------- 1. Base62 short-code collision resistance ----------
function benchCollisionResistance() {
  section("1. Short-link collision resistance (base62, 8 chars)");
  const space = 62 ** 8;
  for (const n of [1_000_000, 10_000_000, 100_000_000]) {
    // birthday-bound approximation: P(collision) ~= 1 - e^(-n^2 / 2N)
    const p = 1 - Math.exp(-(n * n) / (2 * space));
    console.log(
      `  ${n.toLocaleString()} links in flight -> ${(p * 100).toFixed(4)}% chance of a code collision`,
    );
  }
  console.log(`  keyspace: 62^8 = ${space.toLocaleString()} possible codes`);
  console.log("  on collision, fileModel.create() retries with a fresh code (up to 3x)");
}

// ---------- 2. Redis-cached signed download URL vs cold Supabase sign ----------
async function benchDownloadCaching() {
  section("2. Redis-cached download URL vs. cold Supabase sign");
  // Next dev compiles routes on first hit; warm the route up on a throwaway
  // code so that JIT cost doesn't get counted as "cold cache" cost.
  await fetch(`${APP_URL}/api/files/__warmup__/download`).catch(() => {});

  const name = `bench-${randomUUID()}.txt`;
  const path = `u/${randomUUID()}`;
  const body = Buffer.from("aeroshare bench file");

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "text/plain",
  });
  if (upErr) throw new Error(`seed upload failed: ${upErr.message}`);

  const { data: row, error: insErr } = await supabase
    .from("files")
    .insert({
      short_code: `bn${randomUUID().slice(0, 6)}`,
      original_name: name,
      size_bytes: body.length,
      mime_type: "text/plain",
      storage_path: path,
      status: "ready",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .select()
    .single();
  if (insErr) throw new Error(`seed row failed: ${insErr.message}`);

  const url = `${APP_URL}/api/files/${row.short_code}/download`;
  const timings = [];
  for (let i = 0; i < 6; i++) {
    const t0 = process.hrtime.bigint();
    const res = await fetch(url);
    const t1 = process.hrtime.bigint();
    if (!res.ok) throw new Error(`download endpoint ${res.status}`);
    await res.json();
    timings.push(ms(t0, t1));
  }
  const cold = timings[0];
  const warm = timings.slice(1);
  console.log(`  request 1 (cold, signs via Supabase Storage): ${cold.toFixed(1)}ms`);
  console.log(
    `  requests 2-6 (served from Redis cache): avg ${avg(warm).toFixed(1)}ms, ` +
      `min ${Math.min(...warm).toFixed(1)}ms`,
  );
  console.log(`  -> ${(cold / avg(warm)).toFixed(1)}x faster on cache hit`);

  await supabase.from("files").delete().eq("id", row.id);
  await supabase.storage.from(BUCKET).remove([path]);
}

// ---------- 3. Concurrent request throughput on /api/uploads/init ----------
async function benchConcurrency() {
  section("3. Concurrent load on POST /api/uploads/init");
  const CONCURRENCY = 50;
  const BATCHES = 6;
  const allTimings = [];
  const codes = [];

  // Spread requests across distinct simulated client IPs (X-Forwarded-For) so
  // the measurement reflects server/API throughput, not the per-IP rate
  // limiter (that's tested separately below, as its own real feature).
  let ipCounter = 0;
  const fireOne = async () => {
    ipCounter += 1;
    const t0 = process.hrtime.bigint();
    const res = await fetch(`${APP_URL}/api/uploads/init`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`,
      },
      body: JSON.stringify({
        name: "bench.bin",
        size: 1024,
        mime: "application/octet-stream",
        expiresIn: "1d",
      }),
    });
    const t1 = process.hrtime.bigint();
    if (res.ok) {
      const json = await res.json();
      codes.push(json.code);
    }
    return { ms: ms(t0, t1), ok: res.ok, status: res.status };
  };

  const tryFireOne = () => fireOne().catch((err) => ({ ms: 0, ok: false, status: `ERR:${err.message}` }));

  const started = process.hrtime.bigint();
  for (let b = 0; b < BATCHES; b++) {
    const t0 = process.hrtime.bigint();
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, tryFireOne));
    const batchMs = ms(t0, process.hrtime.bigint());
    console.log(`  batch ${b + 1}: ${CONCURRENCY} concurrent requests in ${(batchMs / 1000).toFixed(2)}s`);
    allTimings.push(...results);
  }
  const elapsedSec = ms(started, process.hrtime.bigint()) / 1000;

  const ok = allTimings.filter((r) => r.ok);
  const failed = allTimings.filter((r) => !r.ok);
  const latencies = ok.map((r) => r.ms);

  console.log(`  ${allTimings.length} requests across ${CONCURRENCY} concurrent clients x ${BATCHES} batches, in ${elapsedSec.toFixed(2)}s`);
  console.log(`  throughput: ${(allTimings.length / elapsedSec).toFixed(1)} req/s sustained`);
  console.log(`  ${ok.length} succeeded, ${failed.length} failed`);
  if (failed.length) {
    const reasons = {};
    for (const r of failed) reasons[r.status] = (reasons[r.status] ?? 0) + 1;
    console.log(`  failure breakdown: ${JSON.stringify(reasons)}`);
  }
  if (latencies.length) {
    console.log(
      `  latency: avg ${avg(latencies).toFixed(1)}ms, p50 ${pct(latencies, 50).toFixed(1)}ms, ` +
        `p95 ${pct(latencies, 95).toFixed(1)}ms, p99 ${pct(latencies, 99).toFixed(1)}ms`,
    );
  }

  // cleanup: abort every pending record this created
  await Promise.all(
    codes.map((code) =>
      fetch(`${APP_URL}/api/uploads/abort`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch(() => {}),
    ),
  );
}

async function benchPerIpRateLimit() {
  section("3b. Per-IP rate limit on POST /api/uploads/init (same IP, no header spoofing)");
  const fixedIp = "203.0.113.42"; // single simulated client
  const results = [];
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${APP_URL}/api/uploads/init`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": fixedIp },
      body: JSON.stringify({
        name: "bench.bin",
        size: 1024,
        mime: "application/octet-stream",
        expiresIn: "1d",
      }),
    });
    if (res.ok) {
      const json = await res.json();
      await fetch(`${APP_URL}/api/uploads/abort`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: json.code }),
      }).catch(() => {});
    }
    results.push(res.status);
  }
  const blocked = results.filter((s) => s === 429).length;
  console.log(`  15 requests from one IP (limit: 10/min) -> statuses: ${results.join(",")}`);
  console.log(`  ${blocked} blocked with 429 once the per-IP budget was exceeded`);
}

// ---------- 4. Parallel multipart upload vs sequential ----------
async function benchMultipartParallelism() {
  section("4. Parallel multipart upload vs. sequential (24MB, 3x8MB parts)");
  const PART_SIZE = 8 * 1024 * 1024;
  const PARTS = 3;
  const key = `u/bench-${randomUUID()}`;

  const create = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: "application/octet-stream" }),
  );
  const uploadId = create.UploadId;

  const partBuffers = Array.from({ length: PARTS }, () => randomBytes(PART_SIZE));
  const presign = (partNumber) =>
    getSignedUrl(
      s3,
      new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
      { expiresIn: 300 },
    );

  async function putPart(partNumber, body) {
    const url = await presign(partNumber);
    const res = await fetch(url, { method: "PUT", body });
    if (!res.ok) throw new Error(`part ${partNumber} upload failed: ${res.status}`);
  }

  const seqStart = process.hrtime.bigint();
  for (let i = 0; i < PARTS; i++) await putPart(i + 1, partBuffers[i]);
  const seqMs = ms(seqStart, process.hrtime.bigint());

  const parStart = process.hrtime.bigint();
  await Promise.all(partBuffers.map((buf, i) => putPart(i + 1, buf)));
  const parMs = ms(parStart, process.hrtime.bigint());

  console.log(`  sequential (1 part at a time):  ${(seqMs / 1000).toFixed(2)}s`);
  console.log(`  parallel (3 parts at once, as shipped):   ${(parMs / 1000).toFixed(2)}s`);
  console.log(`  -> ${(seqMs / parMs).toFixed(2)}x faster with the app's parallel upload path`);

  await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
}

async function main() {
  await benchCollisionResistance();
  await benchDownloadCaching();
  await benchConcurrency();
  await benchPerIpRateLimit();
  await benchMultipartParallelism();
  console.log("\nDone. All bench-created rows/objects were cleaned up.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
