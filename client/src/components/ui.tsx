import Link from 'next/link';

export function SectionHeading({
  title,
  subtitle,
  href,
  hrefLabel = 'Xem tất cả',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-fg-subtle sm:text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          {hrefLabel}
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-fg-subtle">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v13.5" />
          <path d="M4 5.5V18a3 3 0 0 0 3 3h13V19.5A2.5 2.5 0 0 0 17.5 17H4Z" />
        </svg>
      </span>
      <p className="font-semibold">{title}</p>
    </div>
  );
}

export function ErrorState({ message, retryHref }: { message: string; retryHref?: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 border-danger/30 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-danger/12 text-danger">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 8v5" />
          <path d="M12 16.5v.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <p className="font-semibold">{message}</p>
      {retryHref && (
        <Link
          href={retryHref}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Thử lại
        </Link>
      )}
    </div>
  );
}

/** Bảng lỗi nhiều dòng dùng khi tải thêm dữ liệu thất bại giữa chừng. */
export function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-5 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
  title,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'outline';
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const variants = {
    primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
    outline: 'border border-line-strong text-fg hover:bg-surface-2',
    ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}