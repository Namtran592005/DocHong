'use client';

import type { LibraryEntry } from './types';

const STORAGE_KEY = 'dochong:library:v1';
const RECENT_KEY = 'dochong:recent:v1';
const PREFS_KEY = 'dochong:prefs:v1';
const READ_KEY = 'dochong:read:v1';

export interface Preferences {
  theme: 'light' | 'dark';
  readerLayout: 'scroll' | 'paged';
  dataSaver: boolean;
  /** Chỉ hiện truyện đã có bản Việt hoá khi tìm kiếm. */
  vietnameseOnly: boolean;
}

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  readerLayout: 'scroll',
  dataSaver: false,
  vietnameseOnly: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bo qua loi quota hoac private mode */
  }
}

/**
 * Toan bo du lieu doc cua nguoi dung chi nam tren may ho.
 * Khong dung Bearer token MangaDex o frontend (muc 7 va 22 cua tai lieu).
 */
export const library = {
  all(): LibraryEntry[] {
    return read<LibraryEntry[]>(STORAGE_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  get(mangaId: string): LibraryEntry | undefined {
    return read<LibraryEntry[]>(STORAGE_KEY, []).find((item) => item.mangaId === mangaId);
  },

  getByChapter(chapterId: string): LibraryEntry | undefined {
    return read<LibraryEntry[]>(STORAGE_KEY, []).find((item) => item.chapterId === chapterId);
  },

  save(entry: LibraryEntry) {
    const items = read<LibraryEntry[]>(STORAGE_KEY, []).filter(
      (item) => item.mangaId !== entry.mangaId,
    );
    items.unshift(entry);
    write(STORAGE_KEY, items.slice(0, 200));
  },

  remove(mangaId: string) {
    write(
      STORAGE_KEY,
      read<LibraryEntry[]>(STORAGE_KEY, []).filter((item) => item.mangaId !== mangaId),
    );
  },

  inProgress(): LibraryEntry[] {
    return this.all().filter((item) => item.totalPages > 0 && item.pageIndex < item.totalPages - 1);
  },

  pushRecent(mangaId: string, title: string, coverFileName?: string) {
    const items = read<{ mangaId: string; title: string; coverFileName?: string; at: number }[]>(
      RECENT_KEY,
      [],
    ).filter((item) => item.mangaId !== mangaId);
    items.unshift({ mangaId, title, coverFileName, at: Date.now() });
    write(RECENT_KEY, items.slice(0, 12));
  },

  recent() {
    return read<{ mangaId: string; title: string; coverFileName?: string; at: number }[]>(
      RECENT_KEY,
      [],
    );
  },

  clearRecent() {
    write(RECENT_KEY, []);
  },

  /** Danh sach chapter da doc cua mot bo truyen, dung de danh dau da doc. */
  readChapters(mangaId: string): string[] {
    const index = read<Record<string, string[]>>(READ_KEY, {});
    return index[mangaId] ?? [];
  },

  markChapterRead(mangaId: string, chapterId: string) {
    const index = read<Record<string, string[]>>(READ_KEY, {});
    const current = index[mangaId] ?? [];
    if (current.includes(chapterId)) return;
    index[mangaId] = [chapterId, ...current].slice(0, 500);
    write(READ_KEY, index);
  },
};

export const prefs = {
  get(): Preferences {
    return { ...DEFAULT_PREFS, ...read<Partial<Preferences>>(PREFS_KEY, {}) };
  },
  update(patch: Partial<Preferences>) {
    const next = { ...this.get(), ...patch };
    write(PREFS_KEY, next);
    return next;
  },
};