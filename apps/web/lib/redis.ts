import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  return "redis://localhost:6379";
};

const getRedisOptions = (): ConstructorParameters<typeof Redis>[0] => {
  const url = getRedisUrl();
  const options: Record<string, unknown> = {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };

  // Upstash and other TLS Redis providers use rediss:// protocol
  if (url.startsWith("rediss://")) {
    options.tls = { rejectUnauthorized: false };
  }

  return options as ConstructorParameters<typeof Redis>[0];
};

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(getRedisUrl(), getRedisOptions());
    _redis.on("error", (err) => {
      console.warn("Redis connection error (non-fatal):", err.message);
    });
  }
  return _redis;
}

// Lazy proxy — only connects when a property is accessed
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return getRedis()[prop as keyof Redis];
  },
});

export const createRedisConnection = () => {
  return new Redis(getRedisUrl(), getRedisOptions());
};
