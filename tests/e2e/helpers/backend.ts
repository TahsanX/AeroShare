import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { bucket, requireEnv } from "./env";

let admin: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  admin ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  return admin;
}

/** Delete Redis keys through the Upstash REST API. */
export async function redisDel(...keys: string[]): Promise<void> {
  const base = requireEnv("UPSTASH_REDIS_REST_URL");
  const token = requireEnv("UPSTASH_REDIS_REST_TOKEN");
  const res = await fetch(`${base}/del/${keys.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Upstash DEL failed: ${res.status}`);
}

/** Make a file expire in the past and drop cached meta/download entries. */
export async function expireFile(code: string): Promise<void> {
  const { error } = await adminClient()
    .from("files")
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("short_code", code);
  if (error) throw new Error(`expireFile failed: ${error.message}`);
  await redisDel(`meta:${code}`, `dl:${code}`);
}

/** Remove DB rows and storage objects for the given short codes. */
export async function deleteFiles(codes: string[]): Promise<void> {
  if (codes.length === 0) return;
  const db = adminClient();
  const { data } = await db.from("files").select("storage_path").in("short_code", codes);
  const paths = (data ?? []).map((r: { storage_path: string }) => r.storage_path);
  if (paths.length) await db.storage.from(bucket()).remove(paths);
  await db.from("files").delete().in("short_code", codes);
  await redisDel(...codes.flatMap((c) => [`meta:${c}`, `dl:${c}`])).catch(() => {});
}

/** Collects created codes so a hook can clean them up. */
export class CodeTracker {
  private codes = new Set<string>();
  add(code: string) {
    this.codes.add(code);
  }
  async cleanup() {
    const list = [...this.codes];
    this.codes.clear();
    await deleteFiles(list);
  }
}

export function codeFromShareUrl(url: string): string {
  const m = /\/s\/([0-9A-Za-z]+)/.exec(url);
  if (!m) throw new Error(`No share code in ${url}`);
  return m[1];
}
