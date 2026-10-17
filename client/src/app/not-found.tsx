import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-5xl font-bold tracking-tight text-fg-subtle">404</p>
      <h1 className="text-xl font-bold">Không tìm thấy trang</h1>
      <p className="max-w-md text-sm text-fg-muted">
        Bộ truyện hoặc chương này có thể đã bị gỡ, hoặc đường dẫn không đúng.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Về trang chủ
        </Link>
        <Link
          href="/tim-kiem"
          className="rounded-lg border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          Tìm truyện Việt hoá
        </Link>
      </div>
    </div>
  );
}