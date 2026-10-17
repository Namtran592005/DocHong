/**
 * Client gọi duy nhất qua máy chủ proxy của website (không gọi thẳng MangaDex).
 * Lý do: MangaDex không trả CORS và cấm hotlink ảnh trực tiếp (mục 1 tài liệu).
 *
 * Cache đặt ở tầng proxy (TTL chính xác hơn), nên ở đây luôn dùng no-store và
 * để Next render theo từng request.
 *
 * Lưu ý: fetch() phía server không chấp nhận đường dẫn tương đối, nên lúc render
 * ở server phải trỏ về một gốc tuyệt đối lấy từ domain đang chạy. Nhờ vậy
 * website không bị gắn với một tên miền nào cả.
 */

const IMG_BASE = '/img';

/** Ngôn ngữ mặc định của website: chỉ hiện truyện đã có bản Việt hoá. */
export const PRIMARY_LANGUAGE = 'vi';

/**
 * Gốc của proxy khi render ở phía server. Được `initRequestContext()` thiết lập
 * mỗi request; nếu chưa thiết lập thì lùi về giá trị phát triển mặc định.
 */
let serverOrigin = '';

/** Chỉ gọi từ phía server — xem `lib/site.ts`. */
export function setApiOrigin(origin: string): void {
  serverOrigin = origin.replace(/\/+$/, '');
}

async function apiBase(): Promise<string> {
  if (typeof window !== 'undefined') return '/api';
  return `${serverOrigin || 'http://localhost:4000'}/api`;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | string[] | undefined | null;
type Query = Record<string, QueryValue>;

function buildQuery(params: Query = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      for (const item of value) search.append(key, item);
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, params: Query = {}): Promise<T> {
  const url = `${await apiBase()}${path}${buildQuery(params)}`;

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new ApiError('Không kết nối được máy chủ thư viện truyện.', 504, 'gateway_timeout');
  }

  if (!response.ok) {
    let message = `Lỗi ${response.status}`;
    let code = 'error';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
      if (body?.code) code = body.code;
    } catch {
      /* phản hồi không phải JSON, giữ thông báo mặc định */
    }
    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export interface MangaQuery {
  title?: string;
  limit?: number;
  offset?: number;
  statuses?: string[];
  tags?: string[];
  tagsMode?: 'AND' | 'OR';
  excludeTags?: string[];
  demographic?: string[];
  translatedLanguage?: string[];
  contentRating?: string[];
  hasChapters?: boolean;
  /** Chỉ lấy truyện đã có bản dịch tiếng Việt. */
  hasVietnamese?: boolean;
  year?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export const api = {
  config: () => request<import('./types').SiteConfig>('/config'),

  tags: () => request<import('./types').CollectionResponse<import('./types').Tag>>('/tags', { limit: 100 }),

  manga: (query: MangaQuery = {}) =>
    request<import('./types').CollectionResponse<import('./types').Manga>>('/manga', {
      title: query.title,
      limit: query.limit ?? 24,
      offset: query.offset ?? 0,
      'status[]': query.statuses,
      'includedTags[]': query.tags,
      includedTagsMode: query.tagsMode,
      'excludedTags[]': query.excludeTags,
      'publicationDemographic[]': query.demographic,
      // MangaDex lọc ngôn ngữ theo kiểu AND (phải có đủ mọi ngôn ngữ được nêu),
      // nên "chỉ hiện truyện có Việt hoá" là thay thế chứ không phải bổ sung.
      'availableTranslatedLanguage[]': query.hasVietnamese
        ? [PRIMARY_LANGUAGE]
        : query.translatedLanguage,
      'contentRating[]': query.contentRating,
      hasAvailableChapters: query.hasChapters ? '1' : undefined,
      year: query.year,
      orderBy: query.orderBy,
      orderDir: query.orderDir,
    }),

  /** Luon tra ve MOT manga duy nhất (response: "entity"), khong phai collection. */
  randomManga: () => request<import('./types').RandomMangaResponse>('/manga/random'),

  mangaDetail: (id: string) =>
    request<import('./types').EntityResponse<import('./types').Manga>>(`/manga/${id}`),

  chapterFeed: (id: string, translatedLanguage?: string[], limit = 100, offset = 0) =>
    request<import('./types').CollectionResponse<import('./types').Chapter>>(`/manga/${id}/feed`, {
      limit,
      offset,
      'translatedLanguage[]': translatedLanguage,
      orderChapter: 'desc',
    }),

  aggregate: (id: string, translatedLanguage?: string) =>
    request<import('./types').AggregateResponse>(`/manga/${id}/aggregate`, {
      'translatedLanguage[]': translatedLanguage,
    }),

  /** Gợi ý truyện tương tự, tự xếp hạng theo thể loại (xem server/src/routes.js). */
  similarManga: (id: string, limit = 12) =>
    request<import('./types').CollectionResponse<import('./types').Manga>>(
      `/manga/${id}/similar`,
      { limit },
    ),

  chapter: (id: string) =>
    request<import('./types').EntityResponse<import('./types').Chapter>>(`/chapter/${id}`),

  chapterPages: (id: string, quality: 'data' | 'data-saver' = 'data') =>
    request<import('./types').ChapterPages>(`/chapter/${id}/pages`, { quality }),

  statistics: (id: string) =>
    request<import('./types').StatisticsResponse>(`/manga/${id}/statistics`),

  /** Thống kê gom nhóm, tối đa 100 manga mỗi lần gọi. */
  statisticsBatch: (ids: string[]) =>
    request<import('./types').StatisticsResponse>('/manga/statistics', {
      ids: ids.join(','),
    }),
};

/** Duong dan anh qua proxy - khong bao gio tro truc tiep sang domain MangaDex. */
export const coverSrc = (mangaId: string, fileName: string | undefined, size = '.512.jpg') =>
  fileName ? `${IMG_BASE}/cover/${mangaId}/${size}/${encodeURIComponent(fileName)}` : '';

export const pageSrc = (chapterId: string, index: number, quality: 'data' | 'data-saver') =>
  `${IMG_BASE}/chapter/${chapterId}/${index}?quality=${quality}`;