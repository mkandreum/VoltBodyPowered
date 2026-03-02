import { incrementRateLimited } from '../utils/metrics.js';

const buckets = new Map();

function pruneExpired(now) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimiter({ windowMs, max, keyPrefix = 'global' }) {
  return (req, res, next) => {
    const now = Date.now();
    pruneExpired(now);

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      incrementRateLimited();
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(Math.max(retryAfter, 1)));
      return res.status(429).json({
        error: 'Too many requests',
        details: `Try again in ${Math.max(retryAfter, 1)} seconds`,
      });
    }

    next();
  };
}
