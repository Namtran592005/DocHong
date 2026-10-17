<p align="center">
  <img src="docs/logo-256.png" alt="Đọc Hồng" width="96">
</p>

<h1 align="center">Đọc Hồng</h1>

<p align="center">
  Website đọc truyện trực tuyến, ưu tiên truyện đã có bản Việt hoá.
</p>

---

## Tính năng

- **Ưu tiên Việt hoá** — mặc định chỉ hiện truyện đã có bản dịch tiếng Việt
- **Ba bố cục xếp hạng** — dòng thời gian, bảng xếp hạng, lưới thẻ điểm
- **Gợi ý truyện cùng thể loại** — tự xếp hạng theo mức độ trùng thể loại
- **Trang đọc** — cuộn liên tục hoặc lật từng trang, thu phóng, chế độ tiết kiệm dữ liệu
- **Tìm kiếm có đề xuất** — gõ là ra danh sách, `Ctrl+K` để nhảy vào ô tìm kiếm
- **Bộ lọc chi tiết** — thể loại, chủ đề, tình trạng, ngôn ngữ dịch, đối tượng, năm phát hành
- **Giao diện sáng và tối** — responsive trên desktop, máy tính bảng và điện thoại
- **Tiến độ đọc lưu cục bộ** — không cần đăng nhập, không gửi dữ liệu lên máy chủ

## Công nghệ

| Phần | Dùng gì |
|---|---|
| Giao diện | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Máy chủ trung gian | Node.js 20+, Express 5 |
| Dữ liệu | API MangaDex |

MangaDex không trả CORS và cấm hotlink ảnh, nên cần một máy chủ trung gian làm proxy
và cache. Kiến trúc:

```text
Trình duyệt → máy chủ của bạn (proxy + cache) → api.mangadex.org
```

## Chạy dự án

```bash
npm install

copy server\.env.example server\.env    # Windows
# cp server/.env.example server/.env     # macOS / Linux

npm run dev
```

Mở <http://localhost:3000>. Máy chủ trung gian chạy ở cổng 4000.

Trước khi phát hành, nhớ đặt `MANGADEX_USER_AGENT` trong `server/.env`:

```env
MANGADEX_USER_AGENT=DocHong/1.0 (+https://tenmiencuaban)
```

## Giấy phép

Mã nguồn dùng giấy phép [MIT](LICENSE).

Giấy phép này **chỉ phủ mã nguồn của dự án**. Dữ liệu truyện, bản dịch và hình ảnh
thuộc về tác giả, nhà xuất bản và các nhóm scanlation — không nằm trong phạm vi MIT.
Dự án chỉ xây dựng giao diện đọc. Không quảng cáo, không dịch vụ trả phí.

Khiếu nại bản quyền: <https://t.me/namtran5905>

## Tài liệu

- [`docs/MangaDexAPIDocumentation.md`](docs/MangaDexAPIDocumentation.md) — tài liệu API MangaDex