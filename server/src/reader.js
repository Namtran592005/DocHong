import { TtlCache } from './cache.js';
import { config } from './config.js';
import { MangaDexError, assertUuid, getBuffer, getJson } from './mangadex.js';

/**
 * `baseUrl` MangaDex@Home chỉ hợp lệ khoảng 15 phút và riêng cho từng chapter
 * (mục 5 tài liệu). Vì vậy cache ngắn hạn và luôn lấy lại khi hết hạn.
 */
const atHomeCache = new TtlCache({ maxEntries: 500 });

export async function getAtHomeServer(chapterId) {
  const id = assertUuid(chapterId, 'chapterId');
  const cached = atHomeCache.get(`athome:${id}`);
  if (cached) return cached;

  const body = await getJson(
    `/at-home/server/${id}`,
    config.forcePort443 ? { forcePort443: true } : {},
  );

  const hash = body?.chapter?.hash;
  const files = Array.isArray(body?.chapter?.data) ? body.chapter.data : null;
  const dataSaver = Array.isArray(body?.chapter?.dataSaver) ? body.chapter.dataSaver : null;

  if (!body?.baseUrl || !hash || !files?.length) {
    throw new MangaDexError('Chương này không có trang đọc (thường là chương không dùng nguồn)', {
      status: 404,
      code: 'no_pages',
    });
  }

  const payload = {
    baseUrl: body.baseUrl,
    hash,
    files,
    dataSaver,
    fetchedAt: Date.now(),
  };
  atHomeCache.set(`athome:${id}`, payload, config.ttl.atHome);
  return payload;
}

/**
 * Trả về danh sách trang cho frontend.
 * Frontend KHÔNG được giữ URL MangaDex@Home lâu dài; khi hết hạn sẽ gọi lại
 * endpoint này.
 */
export async function getChapterPages(chapterId, { quality = 'data', force = false } = {}) {
  if (force) atHomeCache.delete(`athome:${assertUuid(chapterId, 'chapterId')}`);
  const server = await getAtHomeServer(chapterId);
  const useSaver = quality === 'data-saver';
  const files = useSaver && server.dataSaver?.length ? server.dataSaver : server.files;

  return {
    chapterId,
    quality: useSaver && server.dataSaver?.length ? 'data-saver' : 'data',
    hash: server.hash,
    total: files.length,
    // Đường dẫn nội bộ của server proxy, không lộ URL MangaDex@Home ra ngoài
    pages: files.map((_, index) => `/img/chapter/${chapterId}/${index}`),
    expiresAt: server.fetchedAt + config.ttl.atHome,
  };
}

const HASH_RE = /^[a-f0-9]{32}$/i;
const FILE_RE = /^[A-Za-z0-9._-]+$/;

export async function getChapterPageImage(chapterId, index, quality = 'data') {
  const server = await getAtHomeServer(chapterId);
  const useSaver = quality === 'data-saver';
  const files = useSaver && server.dataSaver?.length ? server.dataSaver : server.files;

  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= files.length) {
    throw new MangaDexError('Chỉ số trang nằm ngoài phạm vi chương', {
      status: 404,
      code: 'page_out_of_range',
    });
  }

  const hash = server.hash;
  const file = files[safeIndex];
  if (!HASH_RE.test(hash) || !FILE_RE.test(file)) {
    throw new MangaDexError('Đường dẫn trang không hợp lệ', { status: 400, code: 'invalid_path' });
  }

  const folder = useSaver && server.dataSaver?.length ? 'data-saver' : 'data';
  // MangaDex@Home phục vụ trên tên miền riêng, không phải api.mangadex.org
  const homeUrl = new URL(
    `${folder}/${encodeURIComponent(hash)}/${encodeURIComponent(file)}`,
    server.baseUrl,
  );

  return getBuffer(homeUrl);
}