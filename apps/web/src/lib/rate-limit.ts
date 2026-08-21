interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit({
  identifier,
  limit,
  now = Date.now(),
  windowSeconds
}: {
  identifier: string;
  limit: number;
  now?: number;
  windowSeconds: number;
}): RateLimitResult {
  const existing = buckets.get(identifier);
  const windowMilliseconds = windowSeconds * 1000;
  const entry =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMilliseconds }
      : existing;

  entry.count += 1;
  buckets.set(identifier, entry);

  if (buckets.size > 10_000) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    allowed: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt
  };
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}

export function requestIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "anonymous";
}
