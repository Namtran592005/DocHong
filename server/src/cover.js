import { MangaDexError, assertUuid, getBuffer } from './mangadex.js';

const COVER_SIZES = new Set(['.256.jpg', '.512.jpg', '.1024.jpg', '']);
const DEFAULT_SIZE = '.512.jpg';
const FILE_RE = /^[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

export function coverUrl(mangaId, fileName, size = DEFAULT_SIZE) {
  const id = assertUuid(mangaId, 'mangaId');
  if (!FILE_RE.test(fileName)) {
    throw new MangaDexError('Tên file ảnh bìa không hợp lệ', { status: 400, code: 'invalid_cover' });
  }
  if (!COVER_SIZES.has(size)) {
    throw new MangaDexError('Kích thước ảnh bìa không hợp lệ', {
      status: 400,
      code: 'invalid_cover_size',
    });
  }
  // MangaDex nối hậu tố kích thước vào TÊN FILE ĐẦY ĐỦ, kể cả đuôi.
  // Ví dụ "abc.jpg" -> "abc.jpg.512.jpg". Bỏ đuôi sẽ trả về 404.
  return `https://uploads.mangadex.org/covers/${id}/${fileName}${size}`;
}

/**
 * Không giữ buffer ảnh trong RAM: máy chủ chạy lâu sẽ phình bộ nhớ. Thay vào đó
 * route /img/cover gắn Cache-Control dài để trình duyệt tự cache lại.
 */
export function getCoverImage(mangaId, fileName, size = DEFAULT_SIZE) {
  return getBuffer(coverUrl(mangaId, fileName, size), { maxAttempts: 2 });
}