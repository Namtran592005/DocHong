import type { Metadata } from 'next';
import Link from 'next/link';

import { CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'DMCA — Khiếu nại vi phạm bản quyền',
  description: 'Quy trình gỡ nội dung và xử lý khiếu nại vi phạm bản quyền.',
};

export default function DmcaPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Khiếu nại vi phạm bản quyền
        </h1>
        <p className="mt-3 text-fg-muted">
          Chúng tôi tôn trọng quyền của chủ sở hữu bản quyền và sẽ phản hồi khiếu nại trong thời gian
          sớm nhất có thể.
        </p>
      </header>

      <div className="mt-10 max-w-3xl space-y-8 text-[15px] leading-relaxed text-fg-muted">
        <section>
          <h2 className="text-lg font-bold text-fg">1. Vai trò của chúng tôi</h2>
          <p className="mt-2">
            Đọc Hong là dịch vụ đọc truyện trực tuyến. Chúng tôi không tự đăng tải, không sở hữu và
            không kiểm duyệt nội dung; toàn bộ truyện, bản dịch và hình ảnh được lấy từ API công khai
            của MangaDex. Vì vậy chúng tôi thường chỉ có thể gỡ nội dung theo yêu cầu của chủ sở hữu
            quyền hoặc theo yêu cầu của chính dịch vụ nguồn.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">2. Gửi khiếu nại</h2>
          <p className="mt-2">Vui lòng nhắn tin Telegram tới{' '}
            <a
              href={CONTACT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              @{CONTACT_TELEGRAM}
            </a>{' '}
            kèm các thông tin sau:
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>• Tên tác phẩm và đường dẫn cụ thể đang hiển thị.</li>
            <li>• Bằng chứng xác nhận quyền sở hữu hoặc giấy ủy quyền.</li>
            <li>• Đường dẫn tới bản gốc mà bạn cho là bị sao chép.</li>
            <li>• Thông tin liên hệ để chúng tôi phản hồi.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">3. Quy trình xử lý</h2>
          <ol className="mt-2 space-y-1.5">
            <li>1) Chúng tôi nhận và xác minh khiếu nại.</li>
            <li>2) Nội dung bị gỡ hoặc bị hạn chế truy cập.</li>
            <li>3) Chúng tôi thông báo lại kết quả cho bên gửi khiếu nại.</li>
          </ol>
          <p className="mt-3">
            Vì nội dung đến từ dịch vụ nguồn, việc gỡ tại nguồn có thể mất một khoảng thời gian do
            chính sách phản hồi của bên đó quy định.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">4. Khiếu nại sai hoặc lặp lại</h2>
          <p className="mt-2">
            Khiếu nại thiếu thông tin, gửi hàng loạt hoặc không thuộc phạm vi bản quyền sẽ bị bác
            xử lý. Vui lòng chỉ gửi khiếu nại có căn cứ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">5. Thông tin khác</h2>
          <p className="mt-2">
            Cách chúng tôi sử dụng dữ liệu và lưu trữ tiến độ đọc được nêu trong{' '}
            <Link href="/chinh-sach" className="text-accent hover:underline">
              chính sách bảo mật
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}