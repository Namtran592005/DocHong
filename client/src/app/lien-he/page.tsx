import type { Metadata } from 'next';
import Link from 'next/link';

import { CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với Đọc Hong qua Telegram.',
};

export default function ContactPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Liên hệ</h1>
        <p className="mt-3 text-fg-muted">
          Mọi thắc mắc, góp ý và yêu cầu hỗ trợ đều được xử lý qua một kênh duy nhất.
        </p>
      </header>

      <div className="mt-10 max-w-2xl space-y-6">
        <a
          href={CONTACT_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-accent"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#229ED9] text-white">
            <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
              <path d="M21.7 3.4 2.9 10.2c-.9.3-.9 1.5 0 1.8l4.3 1.3 1.6 5.3c.3.9 1.4 1.1 2 .3l2.3-3 4.4 3.2c.7.5 1.7.1 1.9-.8l3.2-14.3c.2-1-.8-1.8-1.6-1.4l.2-.2ZM9.7 13.2l8-5.6-6.9 6.3-.3 3-1.9-2.9.1-.8Z" />
            </svg>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Telegram</span>
            <span className="block text-sm text-fg-muted">@{CONTACT_TELEGRAM}</span>
          </span>

          <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </a>

        <section className="card-surface p-5">
          <h2 className="text-lg font-bold">Khi nào nên liên hệ</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-fg-muted">
            <li>— Báo truyện hoặc chương bị lỗi, không tải được.</li>
            <li>— Góp ý về giao diện, cách đọc hoặc tốc độ tải trang.</li>
            <li>— Yêu cầu về bản quyền và khiếu nại nội dung.</li>
            <li>— Đề xuất tính năng mới.</li>
          </ul>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-lg font-bold">Khiếu nại bản quyền</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Nếu bạn là chủ sở hữu quyền và muốn yêu cầu gỡ nội dung, vui lòng nhắn kèm các thông tin
            sau:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-fg-muted">
            <li>• Tên tác phẩm và URL của trang đang hiển thị.</li>
            <li>• Bằng chứng về quyền sở hữu hoặc ủy quyền.</li>
            <li>• Thông tin liên hệ của bạn.</li>
          </ul>
          <p className="mt-4 text-sm text-fg-muted">
            Xem thêm trong{' '}
            <Link href="/dmca" className="text-accent hover:underline">
              chính sách DMCA
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}