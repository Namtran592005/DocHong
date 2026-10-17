'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SearchBox } from '@/components/search/SearchBox';
import { SITE_NAME } from '@/lib/site-config';

const NAV = [
  { href: '/tim-kiem?sort=latestUploadedChapter', label: 'Mới cập nhật' },
  { href: '/tim-kiem?sort=followedCount', label: 'Được theo dõi' },
  { href: '/tim-kiem?sort=rating', label: 'Đánh giá cao' },
  { href: '/tim-kiem?view=genres', label: 'Thể loại' },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setTheme((document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      const raw = JSON.parse(localStorage.getItem('dochong:prefs:v1') || '{}');
      localStorage.setItem('dochong:prefs:v1', JSON.stringify({ ...raw, theme: next }));
    } catch {
      /* bỏ qua lỗi quota hoặc chế độ ẩn danh */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="on-brand-btn grid size-10 shrink-0 place-items-center rounded-lg transition-colors"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE_NAME} — trang chủ`}>
      <Image
        src="/logo.png"
        alt=""
        width={40}
        height={40}
        priority
        className="logo-glow size-10 shrink-0 object-contain"
      />
      <span className="font-brand text-[19px] leading-none">{SITE_NAME}</span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(searchParams.get('title') ?? '');
  }, [searchParams]);

  useEffect(() => setMenuOpen(false), [pathname, searchParams]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [menuOpen]);

  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      // Luôn giữ bộ lọc "chỉ hiện truyện đã Việt hoá" khi tìm từ ô tìm kiếm.
      router.push(trimmed ? `/tim-kiem?title=${encodeURIComponent(trimmed)}` : '/tim-kiem');
    },
    [router],
  );

  return (
    <header className="surface-brand sticky top-0 z-50 border-b">
      <div className="container-page flex h-16 items-center gap-3 sm:h-[70px]">
        <Brand />

        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBox
            id="tim-kiem-desktop"
            value={query}
            onChange={setQuery}
            onSubmit={submit}
          />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Danh mục">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="on-brand rounded-lg px-3 py-2 text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ThemeToggle />

          {/* Ô tìm kiếm đã nằm ở hàng riêng bên dưới ở mobile, nên không cần
              thêm một nút tìm kiếm nữa ở đây — sẽ làm tràn ngang. */}
          <div className="relative lg:hidden" ref={panelRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              className="on-brand-btn grid size-10 place-items-center rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-line bg-surface p-2 text-fg shadow-[var(--shadow-pop)]">
                <nav className="flex flex-col" aria-label="Danh mục di động">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <SearchBox
          id="tim-kiem-mobile"
          value={query}
          onChange={setQuery}
          onSubmit={submit}
        />
      </div>
    </header>
  );
}