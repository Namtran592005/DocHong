import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chính sách',
  description: 'Chính sách sử dụng, quyền riêng tư và nguồn dữ liệu của Đọc Hông.',
};

const UPDATED = '01/01/2026';

export default function PolicyPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chính sách</h1>
        <p className="mt-3 text-fg-muted">Cập nhật lần cuối: {UPDATED}</p>
      </header>

      <div className="mt-10 max-w-3xl space-y-8 text-[15px] leading-relaxed text-fg-muted">
        <section>
          <h2 className="text-lg font-bold text-fg">Nguồn dữ liệu</h2>
          <p className="mt-2">
            Dữ liệu truyện, danh sách chương, thông tin bản dịch và hình ảnh được lấy từ MangaDex —
            một dịch vụ cộng đồng. Chúng tôi ghi công nhận nguồn này ở mọi trang, cùng tên nhóm dịch
            tương ứng khi hiển thị nội dung.
          </p>
          <p className="mt-2">
            Chúng tôi không chạy quảng cáo và không cung cấp dịch vụ trả phí, theo điều khoản sử dụng
            của nguồn dữ liệu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Quyền sở hữu nội dung</h2>
          <p className="mt-2">
            Tác phẩm truyện thuộc về tác giả và nhà xuất bản; bản dịch thuộc về các nhóm scanlation.
            Website chỉ cung cấp giao diện đọc và lưu trữ tiến độ, không chứa máy chủ lưu trữ nội
            dung. Quy trình gỡ nội dung được mô tả trong{' '}
            <Link href="/dmca" className="text-accent hover:underline">
              chính sách DMCA
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Nội dung được hiển thị</h2>
          <p className="mt-2">
            Website chỉ hiển thị nội dung ở mức phù hợp để đọc, và mặc định chỉ liệt kê truyện đã có bản
            dịch tiếng Việt. Người đọc có thể tắt tuỳ chọn này trong bộ lọc.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Dữ liệu lưu trên thiết bị</h2>
          <p className="mt-2">
            Tên truyện đã lưu, tiến độ đọc, lịch sử và tuỳ chọn giao diện được lưu trong bộ nhớ cục bộ
            của trình duyệt trên chính thiết bị của bạn. Dữ liệu này không được gửi lên máy chủ và
            không đồng bộ sang thiết bị khác.
          </p>
          <p className="mt-2">
            Bạn có thể xoá toàn bộ dữ liệu này bằng cách xoá dữ liệu trình duyệt của website.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Cookie và quảng cáo</h2>
          <p className="mt-2">
            Website không đặt cookie theo dõi và không hiển thị quảng cáo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Giới hạn trách nhiệm</h2>
          <p className="mt-2">
            Nội dung hiển thị phản ánh dữ liệu do dịch vụ nguồn cung cấp. Chúng tôi không chịu trách
            nhiệm về tính chính xác của bản dịch hay về việc một bản dịch còn tồn tại hay không.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">Thay đổi chính sách</h2>
          <p className="mt-2">
            Nội dung trang này có thể được cập nhật khi nguồn dữ liệu thay đổi điều khoản sử dụng.
          </p>
        </section>
      </div>
    </div>
  );
}