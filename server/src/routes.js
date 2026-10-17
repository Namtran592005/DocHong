import { Router } from 'express';

import { TtlCache, singleFlight } from './cache.js';
import { allowedContentRatings, config, LANGUAGE_VIETNAMESE } from './config.js';
import { getCoverImage } from './cover.js';
import { MangaDexError, assertUuid, getJson } from './mangadex.js';
import { getChapterPageImage, getChapterPages } from './reader.js';

export const api = Router();
export const img = Router();

const cache = new TtlCache({ maxEntries: 3000 });
const inflight = new Map();

/* ------------------------------------------------------------------ helpers */

function asList(value) {
  if (value === undefined || value === null || value === '') return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

function asInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const STATUSES = new Set(['ongoing', 'completed', 'hiatus', 'cancelled']);
const DEMOGRAPHICS = new Set(['shounen', 'shoujo', 'josei', 'seinen', 'none']);
const ORDER_FIELDS = new Set([
  'relevance',
  'title',
  'year',
  'createdAt',
  'updatedAt',
  'latestUploadedChapter',
  'followedCount',
  'rating',
]);

function order(query) {
  const field = query.orderBy;
  const direction = query.orderDir === 'asc' ? 'asc' : 'desc';
  if (!field || !ORDER_FIELDS.has(field)) return undefined;
  return { [`order[${field}]`]: direction };
}

async function cached(key, ttl, loader) {
  const hit = cache.get(key);
  if (hit) return hit;
  const value = await singleFlight(inflight, key, loader);
  cache.set(key, value, ttl);
  return value;
}

function sendError(res, error) {
  const status = error instanceof MangaDexError ? error.status : 500;
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({
    error: true,
    code: error.code || 'internal_error',
    message:
      status >= 500 ? 'Dịch vụ thư viện truyện đang tạm thời không hoạt động' : error.message,
    ...(error.detail ? { detail: error.detail } : {}),
  });
}

/* -------------------------------------------------------------- cấu hình */

api.get('/health', (_req, res) => {
  res.json({ ok: true, upstream: config.baseUrl, cache: cache.stats() });
});

api.get('/config', (_req, res) => {
  res.json({
    maxContentRating: config.maxRating,
    contentRatings: allowedContentRatings(),
    statuses: [...STATUSES],
    demographics: [...DEMOGRAPHICS],
    sortOptions: [...ORDER_FIELDS],
    primaryLanguage: 'vi',
    // MangaDex không có endpoint danh sách ngôn ngữ, đây là tập hợp dùng thường gặp
    translatedLanguages: [
      { code: 'vi', label: 'Tiếng Việt' },
      { code: 'en', label: 'Tiếng Anh' },
      { code: 'ja', label: 'Tiếng Nhật' },
      { code: 'ko', label: 'Tiếng Hàn' },
      { code: 'zh', label: 'Tiếng Trung' },
      { code: 'zh-hk', label: 'Tiếng Trung (Hồng Kông)' },
      { code: 'fr', label: 'Tiếng Pháp' },
      { code: 'de', label: 'Tiếng Đức' },
      { code: 'es', label: 'Tiếng Tây Ban Nha' },
      { code: 'pt-br', label: 'Tiếng Bồ Đào Nha' },
      { code: 'ru', label: 'Tiếng Nga' },
      { code: 'id', label: 'Tiếng Indonesia' },
      { code: 'th', label: 'Tiếng Thái' },
      { code: 'ar', label: 'Tiếng Ả Rập' },
      { code: 'it', label: 'Tiếng Ý' },
    ],
  });
});

api.get('/tags', async (_req, res) => {
  try {
    const body = await cached('tags', config.ttl.tag, () => getJson('/manga/tag', { limit: 100 }));
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

/* ------------------------------------------------------------------- manga */

api.get('/manga', async (req, res) => {
  try {
    const q = req.query;
    const limit = asInt(q.limit, 24, 1, 100);
    const offset = asInt(q.offset, 0, 0, 10_000 - limit);

    const params = {
      limit,
      offset,
      'includes[]': ['cover_art'],
      'contentRating[]': allowedContentRatings(q.contentRating),
      title: q.title ? String(q.title).slice(0, 120) : undefined,
      'authors[]': asList(q.authors),
      'artists[]': asList(q.artists),
      'ids[]': asList(q.ids),
      'status[]': asList(q.status).filter((s) => STATUSES.has(s)),
      'originalLanguage[]': asList(q.originalLanguage),
      'availableTranslatedLanguage[]': asList(q.availableTranslatedLanguage),
      'publicationDemographic[]': asList(q.demographic).filter((d) => DEMOGRAPHICS.has(d)),
      'includedTags[]': asList(q.tags),
      includedTagsMode: q.tagsMode === 'AND' ? 'AND' : 'OR',
      'excludedTags[]': asList(q.excludeTags),
      excludedTagsMode: q.excludeTagsMode === 'AND' ? 'AND' : 'OR',
      hasAvailableChapters: q.hasChapters === undefined ? undefined : String(q.hasChapters),
      year: q.year && /^(none|\d{4})$/.test(String(q.year)) ? String(q.year) : undefined,
      group: q.group ? assertUuid(q.group, 'group') : undefined,
      ...(order(q) || { 'order[relevance]': 'desc' }),
    };

    const key = `manga:${JSON.stringify(params)}`;
    const body = await cached(key, config.ttl.mangaList, () => getJson('/manga', params));
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/manga/random', async (req, res) => {
  try {
    const q = req.query;
    const body = await getJson('/manga/random', {
      'includes[]': ['cover_art'],
      'contentRating[]': allowedContentRatings(q.contentRating),
      'includedTags[]': asList(q.tags),
      'excludedTags[]': asList(q.excludeTags),
      'originalLanguage[]': asList(q.originalLanguage),
      'availableTranslatedLanguage[]': asList(q.availableTranslatedLanguage),
    });
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * Thống kê gom nhóm cho nhiều truyện trong một lần gọi.
 *
 * MangaDex bắt buộc dùng `manga[]` (có dấu ngoặc vuông), không phải `manga`.
 * Điểm đánh giá dùng thang 10 và không kèm số lượt bình chọn.
 *
 * PHẢI đăng ký trước `/manga/:id`, nếu không chuỗi "statistics" sẽ bị `:id`
 * bắt mất và request trả về 400.
 */
api.get('/manga/statistics', async (req, res) => {
  try {
    const ids = asList(req.query.ids).slice(0, 100);
    if (ids.length === 0) {
      res.json({ result: 'ok', statistics: {} });
      return;
    }

    ids.forEach((id) => assertUuid(id, 'mangaId'));

    const key = `stats:batch:${ids.join(',')}`;
    const body = await cached(key, config.ttl.statistics, () =>
      getJson('/statistics/manga', { 'manga[]': ids }),
    );
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/manga/:id', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'mangaId');
    const params = {
      'includes[]': ['cover_art', 'author', 'artist'],
      'contentRating[]': allowedContentRatings(),
    };
    const key = `manga:${id}`;
    const body = await cached(key, config.ttl.mangaDetail, () => getJson(`/manga/${id}`, params));
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/manga/:id/feed', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'mangaId');
    const q = req.query;
    const limit = asInt(q.limit, 100, 1, 500);
    const offset = asInt(q.offset, 0, 0, 10_000 - limit);

    const params = {
      limit,
      offset,
      'includes[]': ['scanlation_group'],
      'contentRating[]': allowedContentRatings(q.contentRating),
      'translatedLanguage[]': asList(q.translatedLanguage).slice(0, 20),
      'order[volume]': q.orderVolume === 'desc' ? 'desc' : 'asc',
      'order[chapter]': q.orderChapter === 'desc' ? 'desc' : 'asc',
      includeUnavailable: q.includeUnavailable ? '1' : '0',
      includeExternalUrl: q.includeExternal ? '1' : undefined,
      excludeExternalUrl: q.includeExternal === undefined ? undefined : '1',
    };

    const key = `feed:${id}:${JSON.stringify(params)}`;
    const body = await cached(key, config.ttl.feed, () => getJson(`/manga/${id}/feed`, params));
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/manga/:id/aggregate', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'mangaId');
    const params = { 'translatedLanguage[]': asList(req.query.translatedLanguage).slice(0, 20) };
    const key = `aggregate:${id}:${JSON.stringify(params)}`;
    const body = await cached(key, config.ttl.aggregate, () =>
      getJson(`/manga/${id}/aggregate`, params),
    );
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * Gợi ý truyện tương tự.
 *
 * Endpoint `/manga/{id}/recommendation` của MangaDex không dùng được: nó chỉ trả
 * về `score` cùng hai ID quan hệ, không kèm tiêu đề hay ảnh bìa. Thay vào đó
 * ta tự xếp hạng: lấy thể loại của truyện, tìm một nhóm ứng viên rồi ưu tiên
 * ứng viên cùng nhiều thể loại nhất.
 */
api.get('/manga/:id/similar', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'mangaId');
    const limit = asInt(req.query.limit, 12, 1, 24);
    const poolSize = Math.min(100, limit * 5);

    const key = `sim:${id}:${limit}`;
    const body = await cached(key, config.ttl.recommendation, async () => {
      const detail = await getJson(`/manga/${id}`, { 'includes[]': ['cover_art'] });
      const allTags = detail?.data?.attributes?.tags ?? [];

      const genres = allTags.filter((tag) => tag.attributes?.group === 'genre');
      const themes = allTags.filter((tag) => tag.attributes?.group === 'theme');

      // Không có thể loại thì không có gì để gợi ý
      if (genres.length === 0) return { result: 'ok', data: [], total: 0 };

      // Ưu tiên truyện đã có bản Việt hoá để khớp với nội dung website
      const params = {
        limit: poolSize,
        offset: 0,
        'includes[]': ['cover_art'],
        'includedTags[]': genres.slice(0, 6).map((tag) => tag.id),
        includedTagsMode: 'OR',
        'contentRating[]': allowedContentRatings(),
        hasAvailableChapters: '1',
        'availableTranslatedLanguage[]': [LANGUAGE_VIETNAMESE],
        'order[followedCount]': 'desc',
      };

      const pool = await getJson('/manga', params);
      const candidates = (pool?.data ?? []).filter((manga) => manga.id !== id);

      // Chủ đề được tính nhẹ hơn thể loại
      const genreIds = new Set(genres.map((tag) => tag.id));
      const themeIds = new Set(themes.map((tag) => tag.id));

      const scored = candidates.map((manga) => {
        const tags = manga.attributes?.tags ?? [];
        let score = 0;
        for (const tag of tags) {
          if (genreIds.has(tag.id)) score += 3;
          else if (themeIds.has(tag.id)) score += 1;
        }
        return { manga, score };
      });

      // Ứng viên vừa tải đã xếp theo độ được theo dõi giảm dần, nên khi điểm bằng
      // nhau thứ tự phổ biến được giữ nguyên.
      scored.sort((a, b) => b.score - a.score);

      const data = scored.slice(0, limit).map((item) => item.manga);
      return { result: 'ok', response: 'collection', data, limit, offset: 0, total: data.length };
    });

    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/manga/:id/statistics', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'mangaId');
    const key = `stats:manga:${id}`;
    const body = await cached(key, config.ttl.statistics, () =>
      getJson('/statistics/manga', { 'manga[]': [id] }),
    );
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

/* ----------------------------------------------------------------- chapter */

api.get('/chapter/:id', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'chapterId');
    const key = `chapter:${id}`;
    const body = await cached(key, config.ttl.chapter, () =>
      getJson(`/chapter/${id}`, { 'includes[]': ['manga', 'scanlation_group'] }),
    );
    res.json(body);
  } catch (error) {
    sendError(res, error);
  }
});

api.get('/chapter/:id/pages', async (req, res) => {
  try {
    const id = assertUuid(req.params.id, 'chapterId');
    const quality = req.query.quality === 'data-saver' ? 'data-saver' : 'data';
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const pages = await getChapterPages(id, { quality, force: refresh });
    res.json(pages);
  } catch (error) {
    sendError(res, error);
  }
});

/* ----------------------------------------------------------- proxy hình ảnh */

/**
 * Kích thước nằm trong đường dẫn chứ không phải query string, vì next/image của
 * Next.js không chấp nhận query trên ảnh cục bộ.
 */
img.get('/cover/:mangaId/:size/:fileName', async (req, res) => {
  try {
    const result = await getCoverImage(req.params.mangaId, req.params.fileName, req.params.size);
    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.set('Content-Length', String(result.buffer.length));
    res.end(result.buffer);
  } catch (error) {
    sendError(res, error);
  }
});

img.get('/chapter/:chapterId/:index', async (req, res) => {
  try {
    const quality = req.query.quality === 'data-saver' ? 'data-saver' : 'data';
    const result = await getChapterPageImage(req.params.chapterId, req.params.index, quality);
    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', 'private, max-age=600');
    res.set('Content-Length', String(result.buffer.length));
    res.end(result.buffer);
  } catch (error) {
    sendError(res, error);
  }
});