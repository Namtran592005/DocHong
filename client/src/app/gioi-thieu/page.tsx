import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: 'Đọc Hông là website đọc truyện trực tuyến, ưu tiên truyện đã có bản Việt hoá.',
};

export default function AboutPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Giới thiệu</h1>
        <p className="mt-3 text-fg-muted">
          Đọc Hông là nơi tập hợp truyện tranh đã được dịch và bản dịch đang được cập nhật, giao diện
          gọn nhẹ để đọc được trên mọi thiết bị.
        </p>
      </header>

      <div className="mt-10 max-w-2xl space-y-8">
        <section>
          <h2 className="text-lg font-bold">Chúng tôi ưu tiên gì</h2>
          <p className="mt-2 leading-relaxed text-fg-muted">
            Người đọc Việt thường phải tự hỏi truyện này đã có bản Việt hay chưa. Vì vậy mặc định
            website chỉ hiện những bộ truyện đã có bản dịch tiếng Việt, và mỗi trang chi tiết đều ghi
            rõ tình trạng bản dịch của từng chương.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Cách bộ sưu tập truyện hoạt động</h2>
          <p className="mt-2 leading-relaxed text-fg-muted">
            Toàn bộ dữ liệu truyện, danh sách chương và hình ảnh được lấy từ MangaDex thông qua máy
            chủ trung gian của website. Việc này giúp tải trang nhanh hơn, hạn chế tình trạng ảnh bị
            lỗi, và cho phép chúng tôi kiểm soát tốc độ truy vấn.
          </p>
          <p className="mt-2 leading-relaxed text-fg-muted">
            Tiến độ đọc, truyện đã lưu và lịch sử được giữ ngay trên thiết bị của bạn. Website không
            yêu cầu đăng nhập và không thu thập dữ liệu cá nhân.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Về bản quyền</h2>
          <p className="mt-2 leading-relaxed text-fg-muted">
            Chúng tôi không sở hữu bất kỳ bộ truyện hay bản dịch nào. Tác phẩm gốc thuộc về tác giả
            và nhà xuất bản; bản dịch thuộc về các nhóm scanlation đã đăng tải lên MangaDex. Chúng tôi
            chỉ cung cấp giao diện đọc và ghi công nhận đầy đủ nguồn.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">Phản hồi</h2>
          <p className="mt-2 leading-relaxed text-fg-muted">
            Nếu bạn tìm thấy lỗi hiển thị, muốn góp ý về giao diện hoặc cần báo về nội dung, hãy nhắn
            cho chúng tôi qua Telegram. Mọi phản hồi đều được đọc và phản hồi lại.
          </p>
        </section>
      </div>
    </div>
  );
}