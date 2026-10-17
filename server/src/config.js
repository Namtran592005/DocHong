import 'dotenv/config';

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const baseUrl = process.env.MANGADEX_BASE_URL || 'https://api.mangadex.org';
const userAgent = process.env.MANGADEX_USER_AGENT || 'DocHong/1.0 (+https://example.com/lien-he)';

// MangaDex không trả CORS cho website bên ngoài, nên frontend phải gọi qua server này.
if (baseUrl.includes('mangadex.dev')) {
  console.warn('[cấu hình] Đang dùng API .dev. Hãy đổi sang api.mangadex.org trước khi phát hành.');
}
if (!/https?:\/\//i.test(userAgent)) {
  console.warn(
    '[cấu hình] MANGADEX_USER_AGENT phải là chuỗi đúng, ví dụ: TenUngDung/1.0 (+https://tenmiencuaban)',
  );
}

export const config = {
  baseUrl,
  userAgent,
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  forcePort443: bool(process.env.FORCE_PORT_443, false),

  // MangaDex giới hạn chung ~5 request/giây/IP (mục 2 tài liệu).
  rate: {
    minGapMs: Number(process.env.MDX_MIN_GAP_MS || 220),
  },

  // Thời gian sống của cache (ms)
  ttl: {
    mangaList: 5 * 60_000,
    mangaDetail: 10 * 60_000,
    tag: 60 * 60_000,
    feed: 3 * 60_000,
    aggregate: 10 * 60_000,
    recommendation: 30 * 60_000,
    chapter: 10 * 60_000,
    statistics: 30 * 60_000,
    atHome: 5 * 60_000, // baseUrl MangaDex@Home hết hạn sau ~15 phút
  },

  // Mức nội dung tối đa cho phép hiển thị
  maxRating: process.env.CONTENT_RATING_MAX || 'suggestive',
};

/* ------------------------------------------------ chính sách content rating */

// safe < suggestive < erotica < pornographic
const RATING_LEVEL = { safe: 0, suggestive: 1, erotica: 2, pornographic: 3 };

export function allowedContentRatings(list) {
  const max = RATING_LEVEL[config.maxRating] ?? 1;
  const requested = Array.isArray(list) ? list : String(list || '').split(',');
  return Object.keys(RATING_LEVEL).filter((rating) => RATING_LEVEL[rating] <= max);
}

/** Mã ngôn ngữ dùng cho bản dịch tiếng Việt. */
export const LANGUAGE_VIETNAMESE = 'vi';