'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import {
  DEMOGRAPHIC_OPTIONS,
  LANGUAGE_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  YEAR_OPTIONS,
  buildSearchUrl,
  parseSearch,
} from '@/lib/search-params';
import type { Tag } from '@/lib/types';

interface FilterTag {
  id: string;
  name: string;
}

/* --------------------------------------------------------------- các nhóm */

interface FacetProps {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  grid?: boolean;
  defaultOpen?: boolean;
}

function Facet({
  title,
  options,
  selected,
  onToggle,
  searchable = false,
  grid = false,
  defaultOpen = false,
}: FacetProps) {
  const [open, setOpen] = useState(defaultOpen || selected.length > 0);
  const [term, setTerm] = useState('');

  const visible = useMemo(
    () =>
      term
        ? options.filter((option) => option.label.toLowerCase().includes(term.toLowerCase()))
        : options,
    [options, term],
  );

  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {selected.length > 0 && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg tabular-nums">
              {selected.length}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="pb-3.5">
          {searchable && (
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Tìm trong danh sách…"
              aria-label={`Tìm trong ${title}`}
              className="mb-2 h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-xs outline-none focus:border-accent"
            />
          )}

          <div className={grid ? 'grid grid-cols-2 gap-1.5' : 'flex flex-wrap gap-1.5'}>
            {visible.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-line bg-surface-2 text-fg-muted hover:border-line-strong hover:text-fg'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="text-xs text-fg-subtle">Không có kết quả</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- panel */

export function SearchFilters({
  tags,
  total,
}: {
  tags: Tag[];
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openMobile, setOpenMobile] = useState(false);

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

  const navigate = useCallback(
    (patch: Record<string, string | string[] | undefined>) => {
      router.push(buildSearchUrl(params, patch), { scroll: false });
    },
    [router, params],
  );

  const toggleIn = (key: string, current: string[], value: string) =>
    navigate({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });

  const toOptions = (list: FilterTag[]) =>
    list.map((tag) => ({ value: tag.id, label: tag.name }));

  const genreOptions = toOptions(
    tags
      .filter((tag) => tag.attributes.group === 'genre')
      .map((tag) => ({
        id: tag.id,
        name: tag.attributes.name?.vi ?? tag.attributes.name?.en ?? '',
      }))
      .filter((tag) => tag.name),
  );

  const themeOptions = toOptions(
    tags
      .filter((tag) => tag.attributes.group === 'theme')
      .map((tag) => ({
        id: tag.id,
        name: tag.attributes.name?.vi ?? tag.attributes.name?.en ?? '',
      }))
      .filter((tag) => tag.name),
  );

  const activeCount =
    search.statuses.length +
    search.tags.length +
    search.demographics.length +
    search.languages.length +
    (search.year ? 1 : 0) +
    (search.hasChapters ? 1 : 0) +
    (search.hasVietnamese ? 0 : 1);

  const body = (
    <>
      {/* Sắp xếp — combobox gốc của trình duyệt */}
      <div className="border-b border-line py-3.5">
        <p className="mb-2 text-sm font-semibold">Sắp xếp theo</p>
        <Select
          id="bo-loc-sap-xep"
          label="Sắp xếp theo"
          value={`${search.orderBy}:${search.orderDir}`}
          options={SORT_OPTIONS.flatMap((option) => [
            { value: `${option.value}:desc`, label: `${option.label} ↓` },
            { value: `${option.value}:asc`, label: `${option.label} ↑` },
          ])}
          onChange={(value) => {
            const [sort, dir] = value.split(':');
            navigate({ sort, dir });
          }}
        />
      </div>

      {/* Bản Việt — công tắc nổi bật vì đây là điều người đọc quan tâm nhất */}
      <div className="border-b border-line py-3.5">
        <Switch
          checked={search.hasVietnamese}
          onChange={(value) => navigate({ vi: value ? undefined : '0' })}
          label="Chỉ hiện truyện đã Việt hoá"
        />
      </div>

      <Facet
        title="Tình trạng"
        defaultOpen
        options={STATUS_OPTIONS}
        selected={search.statuses}
        onToggle={(value) => toggleIn('status', search.statuses, value)}
      />
      <Facet
        title="Bản dịch"
        defaultOpen
        options={LANGUAGE_OPTIONS.map((option) => ({
          value: option.code,
          label: option.label,
        }))}
        selected={search.languages}
        onToggle={(value) => toggleIn('lang', search.languages, value)}
        searchable
      />
      <Facet
        title="Thể loại"
        defaultOpen
        options={genreOptions}
        selected={search.tags}
        onToggle={(value) => toggleIn('tag', search.tags, value)}
        searchable
      />
      <Facet
        title="Chủ đề"
        options={themeOptions}
        selected={search.tags}
        onToggle={(value) => toggleIn('tag', search.tags, value)}
        searchable
      />
      <Facet
        title="Đối tượng"
        options={DEMOGRAPHIC_OPTIONS}
        selected={search.demographics}
        onToggle={(value) => toggleIn('demographic', search.demographics, value)}
        grid
      />
      <Facet
        title="Năm phát hành"
        options={YEAR_OPTIONS.map((year) => ({
          value: year,
          label: year === 'none' ? 'Không rõ' : year,
        }))}
        selected={search.year ? [search.year] : []}
        onToggle={(value) => navigate({ year: search.year === value ? undefined : value })}
      />

      <div className="py-3.5">
        <Switch
          checked={search.hasChapters}
          onChange={(value) => navigate({ hasChapters: value ? '1' : undefined })}
          label="Chỉ hiện truyện đã có chương"
        />
      </div>

      {activeCount > 0 && (
        <div className="pb-4">
          <button
            type="button"
            onClick={() => router.push('/tim-kiem')}
            className="w-full rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            Xoá bộ lọc ({activeCount})
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: cột lọc cố định */}
      <div className="hidden rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:block">
        <div className="mb-1 flex items-center justify-between border-b border-line pb-2.5">
          <p className="text-sm font-bold">Bộ lọc</p>
          {activeCount > 0 && (
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg tabular-nums">
              {activeCount}
            </span>
          )}
        </div>
        {body}
      </div>

      {/* Mobile: thu gọn, có nút kết quả cố định ở đáy */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpenMobile((open) => !open)}
          aria-expanded={openMobile}
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            Bộ lọc
            {activeCount > 0 && (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg tabular-nums">
                {activeCount}
              </span>
            )}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`size-4 text-fg-subtle transition-transform ${openMobile ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {openMobile && (
          <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
            {body}

            <button
              type="button"
              onClick={() => {
                setOpenMobile(false);
                document
                  .getElementById('ket-qua')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="mt-1 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"
            >
              Xem {total.toLocaleString('vi-VN')} truyện
            </button>
          </div>
        )}
      </div>
    </>
  );
}