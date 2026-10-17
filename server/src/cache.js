/**
 * Cache TTL trong bộ nhớ, kèm giới hạn kích thước để không phình bộ nhớ khi
 * máy chủ chạy lâu dài.
 */
export class TtlCache {
  constructor({ maxEntries = 2000, maxValueBytes = 4 * 1024 * 1024 } = {}) {
    this.map = new Map();
    this.maxEntries = maxEntries;
    this.maxValueBytes = maxValueBytes;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      this.misses += 1;
      return undefined;
    }
    // Đưa lên đầu để cơ chế LRU hoạt động đúng
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlMs) {
    if (value === undefined) return;
    const size = estimateSize(value);
    if (size > this.maxValueBytes) return; // giá trị quá lớn thì bỏ qua cache
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs, size });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  deletePrefix(prefix) {
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  clear() {
    this.map.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.map.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? Number((this.hits / total).toFixed(3)) : 0,
    };
  }
}

function estimateSize(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return value.length;
  if (Buffer.isBuffer(value)) return value.length;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

/**
 * "Single flight": giữ request đang chạy để nhiều request cùng một key chỉ gọi
 * ra MangaDex một lần. Rất quan trọng vì giới hạn 5 request/giây.
 */
export function singleFlight(map, key, factory) {
  const existing = map.get(key);
  if (existing) return existing;

  const promise = factory().finally(() => map.delete(key));
  map.set(key, promise);
  return promise;
}