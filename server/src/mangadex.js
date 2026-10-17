import { config } from './config.js';

export class MangaDexError extends Error {
  constructor(message, { status = 502, code = 'upstream_error', detail = null } = {}) {
    super(message);
    this.name = 'MangaDexError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Hàng đợi + giãn tối đa 5 request/giây (mục 2 tài liệu).
 * Thay vì chạy hết giới hạn rồi nhận 429, dựng sẵn một khoảng "điện" để phải
 * đợi giữa các request. Cách này giữ IP không bị chặn tạm thời.
 */
class RateGate {
  constructor(minGapMs) {
    this.minGapMs = minGapMs;
    this.queue = Promise.resolve();
    this.lastStart = 0;
    this.inFlight = 0;
  }

  schedule(task) {
    const run = this.queue.then(async () => {
      const wait = this.lastStart + this.minGapMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastStart = Date.now();
      this.inFlight += 1;
      try {
        return await task();
      } finally {
        this.inFlight -= 1;
      }
    });
    // Giữ chuỗi để không bị lỗi chưa xử lý làm hàng đứng treo
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

const gate = new RateGate(config.rate.minGapMs);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dùng deep-object query cho MangaDex: order[relevance]=desc, status[]=ongoing */
export function buildUrl(path, params = {}) {
  const url = new URL(path, config.baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue;
        url.searchParams.append(key, String(item));
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/** Kiểm tra UUID trước khi ghép vào đường dẫn (chống path traversal và SSRF). */
export function assertUuid(value, label = 'id') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''))) {
    throw new MangaDexError(`${label} không hợp lệ`, { status: 400, code: 'invalid_id' });
  }
  return String(value);
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/**
 * Lấy JSON từ MangaDex kèm retry/backoff. Không retry vô hạn (mục 19 tài liệu).
 * - 429: chờ theo Retry-After hoặc X-RateLimit-Retry-After
 * - 5xx : exponential backoff, tối đa 3 lần
 */
async function fetchWithBackoff(url, { headers = {}, maxAttempts = 3 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response;
    try {
      response = await gate.schedule(() =>
        fetch(url, {
          headers: {
            Accept: 'application/json',
            // MangaDex yêu cầu User-Agent thật, không giả mạo. Không gửi header Via.
            'User-Agent': config.userAgent,
            ...headers,
          },
          signal: AbortSignal.timeout(20_000),
          redirect: 'follow',
        }),
      );
    } catch (error) {
      lastError = new MangaDexError(`Không kết nối được MangaDex: ${error.message}`, {
        status: 502,
        code: 'network_error',
      });
      await backoff(attempt);
      continue;
    }

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (response.ok) {
      if (body === null) {
        throw new MangaDexError('MangaDex trả về phản hồi không phải JSON', {
          status: 502,
          code: 'invalid_upstream_response',
        });
      }
      return body;
    }

    const detail = body?.errors?.[0]?.detail || null;
    lastError = new MangaDexError(detail || `MangaDex trả về HTTP ${response.status}`, {
      status: response.status,
      code: response.status === 404 ? 'not_found' : 'upstream_error',
      detail,
    });

    if (!RETRYABLE.has(response.status) || attempt === maxAttempts - 1) {
      throw lastError;
    }

    await backoff(attempt, response);
  }

  throw lastError;
}

async function backoff(attempt, response) {
  const retryAfter = Number(response?.headers?.get('retry-after') || 0);
  const rateLimitRetry = Number(response?.headers?.get('x-ratelimit-retry-after') || 0);
  const explicit = retryAfter > 0 ? retryAfter * 1000 : rateLimitRetry;
  const delay = explicit > 0 ? Math.min(explicit, 30_000) : Math.min(30_000, 1000 * 2 ** attempt);
  await sleep(delay);
}

/** GET JSON kèm retry. Không token bắt buộc — chỉ dùng endpoint công khai. */
export function getJson(path, params = {}, options = {}) {
  const url = buildUrl(path, params);
  return fetchWithBackoff(url, options);
}

/** GET dữ liệu nhị phân (dùng cho proxy ảnh MangaDex@Home và ảnh bìa). */
export async function getBuffer(pathOrUrl, { timeoutMs = 25_000, maxAttempts = 2 } = {}) {
  const url = pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl);
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response;
    try {
      response = await gate.schedule(() =>
        fetch(url, {
          headers: { 'User-Agent': config.userAgent, Accept: 'image/*' },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'follow',
        }),
      );
    } catch (error) {
      lastError = new MangaDexError(`Không tải được ảnh: ${error.message}`, {
        status: 502,
        code: 'image_network_error',
      });
      await sleep(500 * 2 ** attempt);
      continue;
    }

    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        buffer,
        contentType: response.headers.get('content-type') || 'image/jpeg',
        etag: response.headers.get('etag') || null,
      };
    }

    lastError = new MangaDexError(`Tải ảnh thất bại, HTTP ${response.status}`, {
      status: response.status === 404 ? 404 : 502,
      code: 'image_error',
    });
    if (!RETRYABLE.has(response.status) || attempt === maxAttempts - 1) throw lastError;
    await sleep(500 * 2 ** attempt);
  }

  throw lastError;
}

export const __internal = { gate, fetchWithBackoff };