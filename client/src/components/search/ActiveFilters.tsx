'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  DEMOGRAPHIC_OPTIONS,
  LANGUAGE_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  buildSearchUrl,
  parseSearch,
} from '@/lib/search-params';
import type { Tag } from '@/lib/types';

interface Chip {
  key: string;
  label: string;
  /** Tham số cần xoá khỏi URL, hoặc thay bằng giá trị mới. */
  patch: Record<string, string | string[] | undefined>;
}

function X({ patch }: { patch: Chip['patch'] }) {
  return (
    <svg viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Toàn bộ điều kiện đang áp dụng, hiển thị thành chip. Bấm vào chip là bỏ ngay
 * điều kiện đó, thay vì phải cuộn tìm trong bảng bộ lọc.
 */
export function ActiveFilters({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useMemo(() => {
    const record: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      const existing = record[key];
      if (existing === undefined) record[key] = value;
      else if (Array.isArray(existing)) existing.push(value);
      else record[key] = [existing, value];
    });
    return record;
  }, [searchParams]);

  const search = useMemo(() => parseSearch(params), [params]);

  const tagName = (id: string) => {
    const tag = tags.find((item) => item.id === id);
    return tag?.attributes.name?.vi ?? tag?.attributes.name?.en ?? 'Thể loại';
  };

  const removeFrom = (key: string, current: string[], value: string) => ({
    [key]: current.filter((item) => item !== value).join() || undefined,
  });

  const chips = useMemo<Chip[]>(() => {
    const list: Chip[] = [];

    for (const value of search.statuses) {
      const option = STATUS_OPTIONS.find((item) => item.value === value);
      list.push({
        key: `status-${value}`,
        label: option?.label ?? value,
        patch: removeFrom('status', search.statuses, value),
      });
    }

    for (const value of search.tags) {
      list.push({
        key: `tag-${value}`,
        label: tagName(value),
        patch: removeFrom('tag', search.tags, value),
      });
    }

    for (const value of search.languages) {
      const option = LANGUAGE_OPTIONS.find((item) => item.code === value);
      list.push({
        key: `lang-${value}`,
        label: option?.label ?? value,
        patch: removeFrom('lang', search.languages, value),
      });
    }

    for (const value of search.demographics) {
      const option = DEMOGRAPHIC_OPTIONS.find((item) => item.value === value);
      list.push({
        key: `demo-${value}`,
        label: option?.label ?? value,
        patch: removeFrom('demographic', search.demographics, value),
      });
    }

    if (search.year) {
      const option = YEAR_OPTIONS.find((item) => item === search.year);
      list.push({
        key: 'year',
        label: option ? (option === 'none' ? 'Năm: Không rõ' : `Năm ${option}`) : search.year,
        patch: { year: undefined },
      });
    }

    if (search.hasChapters) {
      list.push({ key: 'chapters', label: 'Đã có chương', patch: { hasChapters: undefined } });
    }

    if (!search.hasVietnamese) {
      list.push({ key: 'vi-off', label: 'Không giới hạn bản Việt', patch: { vi: undefined } });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tags]);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => router.push(buildSearchUrl(params, chip.patch), { scroll: false })}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:border-accent"
        >
          {chip.label}
          <X patch={chip.patch} />
          <span className="sr-only">Bỏ điều kiện {chip.label}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => router.push('/tim-kiem', { scroll: false })}
        className="rounded-full px-2 py-1 text-xs font-medium text-fg-subtle underline underline-offset-2 transition-colors hover:text-danger"
      >
        Xoá tất cả
      </button>
    </div>
  );
}