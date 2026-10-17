import Image from 'next/image';
import Link from 'next/link';

import { CONTACT_TELEGRAM, SITE_NAME } from '@/lib/site-config';

const columns = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Tìm kiếm', href: '/tim-kiem' },
      { label: 'Mới cập nhật', href: '/tim-kiem?sort=latestUploadedChapter' },
      { label: 'Được theo dõi', href: '/tim-kiem?sort=followedCount' },
      { label: 'Tất cả thể loại', href: '/tim-kiem?view=genres' },
    ],
  },
  {
    title: 'Tình trạng',
    links: [
      { label: 'Đang cập nhật', href: '/tim-kiem?status=ongoing' },
      { label: 'Hoàn thành', href: '/tim-kiem?status=completed' },
      { label: 'Tạm ngưng', href: '/tim-kiem?status=hiatus' },
    ],
  },
  {
    title: 'Bản dịch',
    links: [
      { label: 'Có bản Việt hoá', href: '/tim-kiem?lang=vi' },
      { label: 'Tiếng Anh', href: '/tim-kiem?vi=0&lang=en' },
      { label: 'Tiếng Nhật', href: '/tim-kiem?vi=0&lang=ja' },
    ],
  },
  {
    title: 'Thông tin',
    links: [
      { label: 'Giới thiệu', href: '/gioi-thieu' },
      { label: 'Liên hệ', href: '/lien-he' },
      { label: 'Chính sách', href: '/chinh-sach' },
      { label: 'DMCA', href: '/dmca' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="surface-brand-deep mt-16 border-t">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt=""
              width={56}
              height={56}
              className="logo-glow size-14 shrink-0 object-contain"
            />
            <span className="font-brand text-xl leading-none">{SITE_NAME}</span>
          </Link>
          <p className="on-brand-muted mt-3 max-w-xs text-sm leading-relaxed">
            Kho truyện Việt hoá, cập nhật liên tục.
          </p>
          <a
            href={`https://t.me/${CONTACT_TELEGRAM}`}
            target="_blank"
            rel="noopener noreferrer"
            className="on-brand-btn mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M21.7 3.4 2.9 10.2c-.9.3-.9 1.5 0 1.8l4.3 1.3 1.6 5.3c.3.9 1.4 1.1 2 .3l2.3-3 4.4 3.2c.7.5 1.7.1 1.9-.8l3.2-14.3c.2-1-.8-1.8-1.6-1.4l.2-.2ZM9.7 13.2l8-5.6-6.9 6.3-.3 3-1.9-2.9.1-.8Z" />
            </svg>
            @{CONTACT_TELEGRAM}
          </a>
          <p className="on-brand-muted mt-4 text-xs leading-relaxed">
            Dữ liệu, bản dịch và hình ảnh từ MangaDex và các nhóm scanlation tương ứng.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="on-brand text-xs font-semibold tracking-[0.14em] uppercase">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="on-brand-muted text-sm transition-opacity hover:opacity-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs text-current opacity-70">
          © {new Date().getFullYear()} {SITE_NAME}. Không quảng cáo, không dịch vụ trả phí.
        </div>
      </div>
    </footer>
  );
}