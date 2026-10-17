import type { MangaQuery } from './api';
import { LANGUAGE_VIETNAMESE } from './format';

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ParsedSearch {
  title: string;
  statuses: string[];
  tags: string[];
  tagsMode: 'AND' | 'OR';
  demographics: string[];
  languages: string[];
  hasChapters: boolean;
  /** Mặc định bật: chỉ hiện truyện đã có bản Việt hoá. */
  hasVietnamese: boolean;
  year: string;
  orderBy: string;
  orderDir: 'asc' | 'desc';
  view: 'results' | 'genres';
}

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'latestUploadedChapter', label: 'Mới cập nhật' },
  { value: 'followedCount', label: 'Được theo dõi nhiều' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'title', label: 'Tên A – Z' },
  { value: 'year', label: 'Năm phát hành' },
  { value: 'relevance', label: 'Liên quan' },
];

export const YEAR_OPTIONS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'none'];

export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
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
];

export const DEMOGRAPHIC_OPTIONS: { value: string; label: string }[] = [
  { value: 'shounen', label: 'Shounen' },
  { value: 'shoujo', label: 'Shoujo' },
  { value: 'josei', label: 'Josei' },
  { value: 'seinen', label: 'Seinen' },
  { value: 'none', label: 'Khác' },
];

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ongoing', label: 'Đang cập nhật' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'hiatus', label: 'Tạm ngưng' },
  { value: 'cancelled', label: 'Đã huỷ' },
];

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSearch(params: SearchParams): ParsedSearch {
  const sort = typeof params.sort === 'string' ? params.sort : '';
  // Mặc định chỉ hiện truyện có Việt hoá; chỉ tắt khi người dùng chủ động chọn.
  const hasVietnamese = params.vi !== '0' && params.vi !== 'false';

  return {
    title: typeof params.title === 'string' ? params.title.trim() : '',
    statuses: toArray(params.status),
    tags: toArray(params.tag),
    tagsMode: params.tagMode === 'AND' ? 'AND' : 'OR',
    demographics: toArray(params.demographic),
    languages: toArray(params.lang),
    hasChapters: params.hasChapters === '1',
    hasVietnamese,
    year: typeof params.year === 'string' ? params.year : '',
    orderBy: SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'latestUploadedChapter',
    orderDir: params.dir === 'asc' ? 'asc' : 'desc',
    view: params.view === 'genres' ? 'genres' : 'results',
  };
}

export function toQuery(search: ParsedSearch, limit: number, offset = 0): MangaQuery {
  return {
    title: search.title || undefined,
    limit,
    offset,
    statuses: search.statuses,
    tags: search.tags,
    tagsMode: search.tagsMode,
    demographic: search.demographics,
    translatedLanguage: search.languages,
    hasChapters: search.hasChapters,
    hasVietnamese: search.hasVietnamese,
    year: search.year || undefined,
    orderBy: search.orderBy,
    orderDir: search.orderDir,
  };
}

/** Cập nhật bộ lọc trên URL mà không mất các lựa chọn đang dùng. */
export function buildSearchUrl(params: SearchParams, patch: Record<string, string | string[] | undefined>): string {
  const next = new URLSearchParams();

  const apply = (key: string, value: string | string[] | undefined) => {
    next.delete(key);
    if (value === undefined || value === '') return;
    if (Array.isArray(value)) {
      for (const item of value) if (item) next.append(key, item);
    } else {
      next.set(key, value);
    }
  };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item) next.append(key, item);
    } else if (value) {
      next.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(patch)) apply(key, value);

  const query = next.toString();
  return query ? `/tim-kiem?${query}` : '/tim-kiem';
}

/** Mô tả ngắn bộ lọc hiện tại, dùng cho tiêu đề trang. */
export function describeSearch(search: ParsedSearch): string {
  const parts: string[] = [];
  if (search.title) parts.push(`“${search.title}”`);
  if (search.tags.length) parts.push(`${search.tags.length} thể loại`);
  if (search.statuses.length) parts.push(search.statuses.map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s).join(', '));
  if (search.languages.length) parts.push(search.languages.map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.label ?? c).join(', '));
  return parts.length ? parts.join(' · ') : 'Toàn bộ thư viện';
}

/** Ngôn ngữ mặc định khi mở trang chi tiết truyện. */
export const DEFAULT_READ_LANGUAGE = LANGUAGE_VIETNAMESE;