import Link from 'next/link';

import type { Tag } from '@/lib/types';

interface GenrePageProps {
  genreTags: Tag[];
  themeTags: Tag[];
  formatTags: Tag[];
}

function name(tag: Tag): string {
  return tag.attributes.name?.vi ?? tag.attributes.name?.en ?? 'Chưa rõ';
}

/**
 * Biểu tượng gắn với từng thể loại. MangaDex trả tên tiếng Anh trong `name.en`, nên
 * khoá theo tên tiếng Anh và hiển thị bằng tên tiếng Việt bên cạnh.
 */
const ICONS: Record<string, string> = {
  action: '⚔️',
  adventure: '🧭',
  comedy: '😂',
  drama: '🎭',
  fantasy: '🐉',
  horror: '👻',
  mystery: '🔍',
  romance: '💗',
  'sci-fi': '🚀',
  'slice of life': '🍃',
  sports: '⚽',
  supernatural: '👹',
  thriller: '🔪',
  historical: '🏛️',
  school: '🏫',
  military: '🎖️',
  psychological: '🧠',
  mecha: '🤖',
  police: '🚓',
  cooking: '🍳',
  martial_arts: '🥋',
  vampire: '🧛',
  demons: '👿',
  animals: '🐾',
  cars: '🏎️',
  crossdressing: '🎭',
  ecchi: '💗',
  gender_bender: '🔄',
  harem: '💞',
  iyashikei: '☕',
  magic: '✨',
  manhwa: '🖼️',
  medical: '🩺',
  military_history: '🎖️',
  music: '🎵',
  mythology: '🔱',
  parodies: '😜',
  reincarnation: '♻️',
  reverse_harem: '💞',
  samurai: '⚔️',
  seinen: '🖤',
  shoujo: '💖',
  shounen: '💥',
  space: '🪐',
  survival: '🏕️',
  time_travel: '⏳',
  video_game: '🎮',
  visual_arts: '🎨',
  award_winning: '🏆',
};

function iconFor(tag: Tag): string {
  const english = (tag.attributes.name?.en ?? '').toLowerCase().trim();
  return ICONS[english] ?? ICONS[name(tag).toLowerCase()] ?? '';
}

/** Ô tròn nền nhạt dùng khi thể loại chưa có biểu tượng riêng. */
function Monogram({ label, index }: { label: string; index: number }) {
  const initial = label.trim().charAt(0).toUpperCase() || '#';
  // 8 sắc độ xoay để danh sách không đều màu một cách máy móc
  const tones = [
    'bg-rose-500/15 text-rose-500',
    'bg-orange-500/15 text-orange-500',
    'bg-amber-500/15 text-amber-600',
    'bg-emerald-500/15 text-emerald-600',
    'bg-teal-500/15 text-teal-600',
    'bg-sky-500/15 text-sky-600',
    'bg-indigo-500/15 text-indigo-500',
    'bg-violet-500/15 text-violet-500',
  ];

  return (
    <span
      aria-hidden="true"
      className={`grid size-10 shrink-0 place-items-center rounded-xl text-base font-bold ${tones[index % tones.length]}`}
    >
      {initial}
    </span>
  );
}

function TagGroup({
  title,
  tags,
  emptyText,
}: {
  title: string;
  tags: Tag[];
  emptyText: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted tabular-nums">
          {tags.length}
        </span>
      </div>

      {tags.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tags.map((tag, index) => {
            const icon = iconFor(tag);
            return (
              <Link
                key={tag.id}
                href={`/tim-kiem?tag=${tag.id}`}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-accent hover:bg-surface-2"
              >
                {icon ? (
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg leading-none"
                  >
                    {icon}
                  </span>
                ) : (
                  <Monogram label={name(tag)} index={index} />
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-accent">
                  {name(tag)}
                </span>

                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function GenreBrowser({ genreTags, themeTags, formatTags }: GenrePageProps) {
  return (
    <div className="space-y-10">
      <TagGroup title="Dòng truyện" tags={genreTags} emptyText="Chưa tải được danh sách." />
      <TagGroup title="Chủ đề" tags={themeTags} emptyText="Chưa tải được danh sách." />
      <TagGroup title="Hình thức" tags={formatTags} emptyText="Chưa tải được danh sách." />
    </div>
  );
}