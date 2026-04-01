import { incrementRateLimited } from '../utils/metrics.js';

const buckets = new Map();

function resolveClientIp(req) {
  const trustProxy = Boolean(req.app?.get('trust proxy'));
  const forwarded = req.headers['x-forwarded-for'];

  if (trustProxy && typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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

    const ip = resolveClientIp(req);
    const userSegment = req.user?.id ? `user:${req.user.id}` : 'anon';
    const key = `${keyPrefix}:${userSegment}:${ip}`;

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
