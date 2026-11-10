export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (needed by e2e helpers)`);
  return v;
}

export const bucket = () => process.env.SUPABASE_BUCKET || "uploads";
