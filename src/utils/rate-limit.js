const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 25;

const requestCounts = new Map();

export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry) {
    requestCounts.set(ip, { count: 1, firstRequestTime: now });
    return true;
  }

  if (now - entry.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.firstRequestTime = now;
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}
