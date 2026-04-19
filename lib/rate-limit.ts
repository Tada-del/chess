import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;

type Entry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

function nowMs() {
  return Date.now();
}

function getKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function cleanupExpired() {
  const now = nowMs();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

export function enforceRateLimit({
  key,
  limit,
  windowMs = WINDOW_MS,
}: {
  key: string;
  limit: number;
  windowMs?: number;
}): RateLimitResult {
  cleanupExpired();

  const hashed = getKey(key);
  const now = nowMs();
  const existing = memoryStore.get(hashed);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(hashed, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  memoryStore.set(hashed, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
