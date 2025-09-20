const cache = new Map();

export function setCache(key, data, ttl = 60) {
  if (cache.has(key)) {
    clearTimeout(cache.get(key).timeoutId);
  }

  const timeoutId = setTimeout(() => {
    cache.delete(key);
  }, ttl * 1000);

  cache.set(key, { data, timeoutId });
}

export function getCache(key) {
  const entry = cache.get(key);
  return entry ? entry.data : null;
}
