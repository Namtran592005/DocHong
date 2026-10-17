import type { MangaStatus } from '@/lib/types';

type Tone = 'neutral' | 'ok' | 'info' | 'warn' | 'danger' | 'accent';

/**
 * Nền đặc chứ không dùng nền trong mờ: các nhãn này nằm trên ảnh bìa nên nền
 * bán trong suốt khiến chữ khó đọc khi ảnh sáng hoặc tối.
 */
const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-700 text-white',
  ok: 'bg-emerald-600 text-white',
  info: 'bg-blue-600 text-white',
  warn: 'bg-amber-500 text-black',
  danger: 'bg-rose-600 text-white',
  accent: 'bg-accent text-accent-fg',
};

const STATUS_TONE: Record<MangaStatus, Tone> = {
  ongoing: 'ok',
  completed: 'info',
  hiatus: 'warn',
  cancelled: 'danger',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap shadow-sm ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: MangaStatus; label: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{label}</Badge>;
}

/** Nhãn trạng thái dùng trên thẻ truyện: nền đặc + viền trắng mảnh cho nổi. */
export function StatusPill({ status, label }: { status: MangaStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap ring-1 ring-white/25 backdrop-blur-[2px] ${TONE_CLASS[STATUS_TONE[status] ?? 'neutral']}`}
    >
      {label}
    </span>
  );
}