/** Kieu du lieu tra ve tu MangaDex, rut gon cho dung nhu goc. */

export type RelationshipType =
  | 'cover_art'
  | 'author'
  | 'artist'
  | 'scanlation_group'
  | 'manga'
  | 'translation_team'
  | 'user';

export interface Relationship {
  id: string;
  type: RelationshipType | string;
  attributes?: {
    name?: LocalizedText;
    title?: LocalizedText;
    altTitles?: LocalizedText;
    fileName?: string;
    description?: LocalizedText;
    website?: string;
  };
}

export interface LocalizedText {
  [lang: string]: string;
}

export type ContentRating = 'safe' | 'suggestive' | 'erotica' | 'pornographic';
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
export type Demographic = 'shounen' | 'shoujo' | 'josei' | 'seinen' | 'none';

export interface Tag {
  id: string;
  type: 'tag';
  attributes: {
    name: LocalizedText;
    description?: LocalizedText;
    group?: 'genre' | 'theme' | 'format' | string;
  };
}

export interface Manga {
  id: string;
  type: 'manga';
  attributes: {
    title: LocalizedText;
    altTitles: LocalizedText[];
    description: LocalizedText;
    originalLanguage: string;
    status: MangaStatus;
    contentRating: ContentRating;
    publicationDemographic?: Demographic;
    year?: number;
    lastVolume?: string | null;
    lastChapter?: string | null;
    tags: Tag[];
    availableTranslatedLanguages: string[];
    createdAt: string;
    updatedAt: string;
    version: number;
    state?: string;
  };
  relationships: Relationship[];
}

export interface Chapter {
  id: string;
  type: 'chapter';
  attributes: {
    title?: string;
    volume?: string | null;
    chapter?: string | null;
    translatedLanguage: string;
    pages: number;
    publishAt?: string;
    readableAt?: string;
    createdAt: string;
    updatedAt: string;
    externalUrl?: string | null;
    version: number;
  };
  relationships: Relationship[];
}

export interface CollectionResponse<T> {
  result: string;
  response: string;
  data: T[];
  limit: number;
  offset: number;
  total: number;
}

export interface EntityResponse<T> {
  result: string;
  response: string;
  data: T;
}

/** /manga/random tra ve `response: "entity"` - chi mot manga, khong phai collection. */
export type RandomMangaResponse = EntityResponse<Manga>;

export interface AggregateVolume {
  volume: string;
  count: number;
  chapters: Record<
    string,
    { chapter: string; id: string; others: number[]; count: number }
  >;
}

export interface AggregateResponse {
  result: string;
  volumes: Record<string, AggregateVolume>;
}

export interface ChapterPages {
  chapterId: string;
  quality: 'data' | 'data-saver';
  hash: string;
  total: number;
  pages: string[];
  expiresAt: number;
}

export interface SiteConfig {
  maxContentRating: ContentRating;
  contentRatings: ContentRating[];
  statuses: MangaStatus[];
  demographics: Demographic[];
  sortOptions: string[];
  translatedLanguages: { code: string; label: string }[];
}

/**
 * Thống kê trả về dạng khóa theo mangaId.
 * Lưu ý: điểm `average` dùng thang 10, và MangaDex không trả số lượt bình chọn.
 */
export interface MangaStatistics {
  follows: number;
  rating?: { average: number; bayesian: number };
  comments?: { threadId: number; repliesCount: number };
  unavailableChaptersCount?: number;
}

export type StatisticsResponse = {
  statistics: Record<string, MangaStatistics>;
};

export interface LibraryEntry {
  mangaId: string;
  title: string;
  coverFileName?: string;
  chapterId: string;
  chapterLabel: string;
  pageIndex: number;
  totalPages: number;
  updatedAt: number;
}