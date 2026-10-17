import type {
  Chapter,
  LocalizedText,
  Manga,
  MangaStatus,
  Relationship,
} from './types';

/** Ngôn ngữ chuẩn của website. */
export const LOCALE = 'vi';

/** Mã ngôn ngữ dùng cho bản dịch tiếng Việt. */
export const LANGUAGE_VIETNAMESE = 'vi';

const LATIN_SUFFIX = /-(ro|romaji|romaja|latin)$/i;

/**
 * Chọn khóa ngôn ngữ tốt nhất. Các bản chép lại Latin (`ko-ro`, `ja-romaji`)
 * thường không phải tên "thật" của bộ truyện, nên chỉ dùng khi hết đường.
 */
function bestAltKey(title: LocalizedText, preferred: string[]): string | undefined {
  const keys = Object.keys(title).filter((key) => title[key]?.trim());
  if (keys.length === 0) return undefined;

  const meaningful = keys.filter((key) => !LATIN_SUFFIX.test(key));
  const pool = meaningful.length ? meaningful : keys;

  for (const lang of [...preferred, 'ja']) {
    if (pool.includes(lang)) return lang;
  }
  return pool[0];
}

/** Thứ tự ưu tiên khi hiển thị tiêu đề: tiếng Việt, rồi tiếng Anh. */
const TITLE_PRIORITY = [LOCALE, 'en'];

/**
 * MangaDex lưu tiêu đề theo nhiều ngôn ngữ. Chọn bản tiếng Việt trước, rồi
 * tiếng Anh, rồi bản có ý nghĩa của ngôn ngữ gốc.
 */
export function localizedTitle(
  title: LocalizedText | undefined,
  preferred: string[] = TITLE_PRIORITY,
): string {
  if (!title) return 'Chưa có tên';
  for (const lang of preferred) {
    const value = title[lang];
    if (value?.trim()) return value.trim();
  }
  const key = bestAltKey(title, preferred);
  return (key && title[key].trim()) || 'Chưa có tên';
}

/** Khóa ngôn ngữ của bản tiêu đề đang được chọn. */
export function titleLanguageKey(
  title: LocalizedText | undefined,
  preferred: string[] = TITLE_PRIORITY,
): string | undefined {
  if (!title) return undefined;
  for (const lang of preferred) if (title[lang]?.trim()) return lang;
  return bestAltKey(title, preferred);
}

/**
 * Nhiều bộ truyện không có bản `vi` hay `en` trong `title` — chỉ có bản chép lại
 * Latin như `ko-ro`. Bản dùng được thường nằm ở `altTitles`, nên dùng cho cả hai.
 */
export function mangaTitle(manga: Manga, preferred: string[] = TITLE_PRIORITY): string {
  const key = titleLanguageKey(manga.attributes.title, preferred);
  if (!key || !LATIN_SUFFIX.test(key)) return localizedTitle(manga.attributes.title, preferred);

  for (const entry of manga.attributes.altTitles ?? []) {
    if (!entry) continue;
    for (const lang of preferred) {
      const value = entry[lang];
      if (value?.trim()) return value.trim();
    }
  }
  return localizedTitle(manga.attributes.title, preferred);
}

export function alternateTitles(manga: Manga, preferred = LOCALE): string[] {
  const names = new Set<string>();
  for (const entry of manga.attributes.altTitles ?? []) {
    if (!entry) continue;
    const key = bestAltKey(entry, [preferred, 'en']);
    if (key) names.add(entry[key].trim());
  }
  names.delete(mangaTitle(manga));
  return [...names].slice(0, 12);
}

/** Mô tả truyện, đã loại bỏ ký tự thừa và chuẩn hoá khoảng trắng. */
export function describeText(
  text: LocalizedText | undefined,
  preferred: string[] = TITLE_PRIORITY,
): string {
  return localizedTitle(text, preferred)
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function relationName(
  rel: Relationship | undefined,
  preferred: string[] = TITLE_PRIORITY,
): string {
  if (!rel?.attributes) return '';
  if (rel.attributes.name) return localizedTitle(rel.attributes.name, preferred);
  if (rel.attributes.title) return localizedTitle(rel.attributes.title, preferred);
  return '';
}

/** Gợi ý ngắn về số chương dưới tên truyện. */
export function chapterCountHint(manga: Manga): string {
  const { lastChapter, lastVolume } = manga.attributes;
  if (lastChapter && lastVolume) return `Tập ${lastVolume} · ${lastChapter}`;
  if (lastChapter) return lastChapter;
  if (lastVolume) return `Tập ${lastVolume}`;
  return 'Đang cập nhật';
}

/* ------------------------------------------------- bản dịch tiếng Việt */

/** Truyện đã có ít nhất một bản dịch tiếng Việt chưa. */
export function hasVietnamese(manga: Manga): boolean {
  return (manga.attributes.availableTranslatedLanguages ?? []).includes(LANGUAGE_VIETNAMESE);
}

/** Danh sách ngôn ngữ dịch, sắp tiếng Việt luôn lên đầu. */
export function sortedLanguages(languages: string[]): string[] {
  return [...languages].sort((a, b) => {
    if (a === LANGUAGE_VIETNAMESE) return -1;
    if (b === LANGUAGE_VIETNAMESE) return 1;
    return (LANGUAGE_LABEL[a] ?? a).localeCompare(LANGUAGE_LABEL[b] ?? b);
  });
}

/** Tên ngôn ngữ dịch, luôn hiển thị bằng tiếng Việt. */
export const LANGUAGE_LABEL: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  ja: 'Tiếng Nhật',
  ko: 'Tiếng Hàn',
  zh: 'Tiếng Trung',
  'zh-hk': 'Tiếng Trung (Hồng Kông)',
  fr: 'Tiếng Pháp',
  de: 'Tiếng Đức',
  es: 'Tiếng Tây Ban Nha',
  'pt-br': 'Tiếng Bồ Đào Nha',
  ru: 'Tiếng Nga',
  id: 'Tiếng Indonesia',
  th: 'Tiếng Thái',
  ar: 'Tiếng Ả Rập',
  it: 'Tiếng Ý',
  pl: 'Tiếng Ba Lan',
  tr: 'Tiếng Thổ Nhĩ Kỳ',
  uk: 'Tiếng Ukraine',
};

export const languageLabel = (code?: string | null) =>
  (code && LANGUAGE_LABEL[code]) || (code ? code.toUpperCase() : 'Chưa rõ');

/* ------------------------------------------------------------------ chương */

export function chapterLabel(chapter: {
  volume?: string | null;
  chapter?: string | null;
  title?: string | null;
}): string {
  const parts: string[] = [];
  if (chapter.volume) parts.push(`Tập ${chapter.volume}`);
  if (chapter.chapter) parts.push(`Chương ${chapter.chapter}`);
  else if (chapter.title) parts.push(chapter.title);

  const base = parts.join(' · ') || 'Chương chưa đánh số';
  return chapter.title && chapter.chapter ? `${base} — ${chapter.title.trim()}` : base;
}

/** Nhãn ngắn cho thanh tiến độ và thẻ "tiếp tục đọc". */
export function chapterShortLabel(chapter: Chapter): string {
  if (chapter.attributes.chapter) return `Chương ${chapter.attributes.chapter}`;
  if (chapter.attributes.volume) return `Tập ${chapter.attributes.volume}`;
  return chapter.attributes.title?.trim() || 'Chương mới nhất';
}

export const STATUS_LABEL: Record<MangaStatus, string> = {
  ongoing: 'Đang cập nhật',
  completed: 'Hoàn thành',
  hiatus: 'Tạm ngưng',
  cancelled: 'Đã huỷ',
};

/* ---------------------------------------------------------------- ngày giờ */

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const relativeFormatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function relativeTime(value?: string | null): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';

  const minutes = Math.round((time - Date.now()) / 60_000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 24 * 365],
    ['month', 60 * 24 * 30],
    ['day', 60 * 24],
    ['hour', 60],
    ['minute', 1],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(minutes) >= size) {
      return relativeFormatter.format(Math.round(minutes / size), unit);
    }
  }
  return 'vừa xong';
}

/** Rút gọn số lớn cho thống kê: 1200 → 1,2 N; 2500000 → 2,5 Tr. */
export function formatCount(value?: number | null): string {
  if (!value || value <= 0) return '0';
  return new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);
}