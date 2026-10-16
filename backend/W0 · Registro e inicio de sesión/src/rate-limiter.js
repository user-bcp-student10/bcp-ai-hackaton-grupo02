import { rateLimitedError } from "./errors.js";

export function createRateLimiter({ maxRequests, windowMs, now = Date.now }) {
  const clients = new Map();

  return function rateLimiter(req, res, next) {
    const timestamp = now();
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let entry = clients.get(key);

    if (!entry || timestamp - entry.startedAt >= windowMs) {
      entry = { startedAt: timestamp, count: 0 };
      clients.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.startedAt + windowMs - timestamp) / 1000),
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return next(rateLimitedError());
    }

    return next();
  };
}
