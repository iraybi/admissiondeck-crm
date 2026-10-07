import "server-only";
import { prisma } from "@/lib/db/prisma";
import { resolveCustomDomain, type DomainResolution } from "./custom-domains";

/**
 * Redis-backed cache for custom domain resolution.
 * Falls back to in-memory Map when Redis is unavailable.
 *
 * Cache key: `${hostname}:${pathPrefix ?? ""}`
 * TTL: 5 minutes (domains rarely change)
 */

type CacheEntry = {
  value: DomainResolution;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

let redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, ex: number) => Promise<void> } | null = null;

async function getRedis() {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const { Redis } = await import("ioredis");
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await client.connect();
    redis = {
      get: (k: string) => client.get(k),
      set: async (k: string, v: string, ex: number) => {
        await client.set(k, v, "EX", ex);
      },
    };
    return redis;
  } catch {
    return null;
  }
}

export async function getCachedDomain(
  hostname: string,
  pathPrefix?: string | null,
): Promise<DomainResolution> {
  const key = `${hostname.toLowerCase()}:${pathPrefix ?? ""}`;

  // Try Redis first
  const r = await getRedis();
  if (r) {
    try {
      const cached = await r.get(key);
      if (cached) return JSON.parse(cached);
    } catch {
      // fall through to memory / DB
    }
  }

  // Try in-memory cache
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.value;
  }

  // Query database
  const result = await resolveCustomDomain(hostname, pathPrefix);

  // Cache the result
  memoryCache.set(key, { value: result, expiresAt: Date.now() + TTL_MS });
  if (r) {
    try {
      await r.set(key, JSON.stringify(result), TTL_MS / 1000);
    } catch {
      // ignore
    }
  }

  return result;
}

export function invalidateDomainCache(hostname: string, pathPrefix?: string | null) {
  const key = `${hostname.toLowerCase()}:${pathPrefix ?? ""}`;
  memoryCache.delete(key);
  // Redis TTL will expire naturally
}

export function clearDomainCache() {
  memoryCache.clear();
}
