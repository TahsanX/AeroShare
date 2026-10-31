const UNITS = ["B", "KB", "MB", "GB"] as const;

/** 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/** ISO date -> "in 6 days", "in 3 hours", "in 12 minutes" or "expired". */
export function formatExpiry(expiresAt: string, now: Date = new Date()): string {
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "expired";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `in ${Math.max(minutes, 1)} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
