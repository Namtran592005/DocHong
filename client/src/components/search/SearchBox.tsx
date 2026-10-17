'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { api, coverSrc } from '@/lib/api';
import { STATUS_LABEL, mangaTitle } from '@/lib/format';
import type { Manga } from '@/lib/types';

/**
 * Ô tìm kiếm có gợi ý tức thì: người đọc chỉ cần gõ, không phải bấm nút.
 * Chỉ hiện danh sách khi đã gõ ít nhất 2 ký tự để tránh dội lượt truy vấn rác.
 */
export function SearchBox({
  id,
  value,
  onChange,
  onSubmit,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  const router = useRouter();
  const listId = useId();

  const [items, setItems] = useState<Manga[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Bỏ qua ký tự thừa, dùng khoảng trắng làm ký tự đại diện cho tiêu đề
  const term = useMemo(() => value.trim().replace(/\s+/g, ' '), [value]);

  useEffect(() => {
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setBusy(true);

    // Chờ người dùng ngừng gõ 250 ms rồi mới gọi, tránh gọi liên tục
    const timer = setTimeout(() => {
      api
        .manga({ title: term, limit: 6, hasVietnamese: true, hasChapters: true })
        .then((response) => {
          if (cancelled) return;
          setItems(response.data ?? []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Ctrl/Cmd + K đưa con trỏ vào ô tìm kiếm
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (mangaId: string) => {
    setOpen(false);
    onChange('');
    router.push(`/truyen/${mangaId}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      if (event.key === 'Enter') onSubmit(value);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0) pick(items[activeIndex].id);
      else onSubmit(value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
          onSubmit(value);
        }}
        role="search"
      >
        <label className="relative block">
          <span className="sr-only">Tìm truyện Việt hoá</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-fg-subtle"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            id={id}
            ref={inputRef}
            type="search"
            value={value}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => items.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Tìm truyện đã Việt hoá…"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-16 pl-11 text-sm text-fg transition-colors outline-none placeholder:text-fg-subtle focus:border-accent"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              aria-label="Xoá nội dung tìm kiếm"
              className="absolute top-1/2 right-3 grid size-5 -translate-y-1/2 place-items-center rounded text-fg-subtle transition-colors hover:text-fg"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </label>
      </form>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-fg shadow-[var(--shadow-pop)]"
        >
          {items.map((manga, index) => {
            const fileName = manga.relationships?.find((rel) => rel.type === 'cover_art')
              ?.attributes?.fileName;
            const src = coverSrc(manga.id, fileName, '.256.jpg');

            return (
              <li key={manga.id} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(manga.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors ${
                    index === activeIndex ? 'bg-surface-2' : 'hover:bg-surface-2'
                  }`}
                >
                  <span className="relative aspect-3/4 w-9 shrink-0 overflow-hidden rounded bg-surface-3">
                    {src ? (
                      <Image src={src} alt="" fill sizes="36px" className="object-cover" loading="lazy" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm font-medium">
                      {mangaTitle(manga)}
                    </span>
                    <span className="text-[11px] text-fg-subtle">
                      {STATUS_LABEL[manga.attributes.status]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}

          <li className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSubmit(value);
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-accent transition-colors hover:bg-surface-2"
            >
              Xem tất cả kết quả cho “{term}”
            </button>
          </li>
        </ul>
      )}

      {busy && term.length >= 2 && items.length === 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-fg-subtle shadow-[var(--shadow-pop)]">
          Đang tìm…
        </div>
      )}
    </div>
  );
}