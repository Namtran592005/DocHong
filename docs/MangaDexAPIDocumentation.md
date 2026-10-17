> Hệ thống API cung cấp dữ liệu manga, chapter, metadata, danh sách bản dịch và ảnh đọc truyện thông qua MangaDex@Home.

---

## Tổng quan

| Thông tin | Chi tiết |
|---|---|
| **Base URL** | `https://api.mangadex.org` |
| **Development URL** | `https://api.mangadex.dev` |
| **Swagger UI** | `https://api.mangadex.org/docs/swagger.html` |
| **OpenAPI** | `3.0.3` |
| **API version** | `5.13.1` |
| **Định dạng** | JSON |
| **Mã hóa** | UTF-8 |
| **Phương thức** | GET, POST, PUT, DELETE |
| **ID tài nguyên** | UUID |
| **Xác thực** | Bearer token cho endpoint yêu cầu tài khoản |

> Với website đọc truyện, luồng cốt lõi là: tìm manga → lấy feed chapter → lấy MangaDex@Home server → dựng URL trang ảnh.

---

## Mục lục

- [Tổng quan](#-tổng-quan)
- [Giới hạn request và phân trang](#-2-giới-hạn-request-và-phân-trang)
- [Response chung](#-3-response-chung)
- [Luồng xây web truyện](#-4-luồng-xây-web-truyện-cơ-bản)
- [Tìm kiếm manga và bộ lọc](#-5-tìm-kiếm-manga-và-bộ-lọc)
- [Cover art](#-6-cover-art-và-url-ảnh-bìa)
- [API xác thực](#-7-api-xác-thực)
- [Theo dõi và trạng thái đọc](#-8-theo-dõi-và-trạng-thái-đọc)
- [Recommendation và manga random](#-9-recommendation-và-manga-random)
- [Chapter](#-10-chapter-endpoint-tổng-quát)
- [Scanlation group, author, artist](#-11-scanlation-group-author-artist)
- [Custom list](#-12-custom-list)
- [Upload, rating và report](#-13-uploadchapter-creation)
- [Mã mẫu JavaScript](#-15-mã-mẫu-javascript-frontend--chỉ-dùng-cho-dữ-liệu-nội-bộ-của-backend)
- [Catalog đầy đủ endpoints](#-21-catalog-đầy-đủ-endpoint-theo-openapi-5131)

---

## Các endpoint quan trọng

| Endpoint | Mô tả |
|---|---|
| `GET /manga` | Tìm kiếm và lọc manga |
| `GET /manga/{id}` | Chi tiết manga |
| `GET /manga/tag` | Danh sách tag |
| `GET /manga/{id}/feed` | Danh sách chapter của manga |
| `GET /manga/{id}/aggregate` | Cây volume/chapter |
| `GET /chapter/{id}` | Chi tiết chapter |
| `GET /at-home/server/{chapterId}` | Lấy server và file ảnh đọc truyện |
| `GET /cover/{mangaOrCoverId}` | Thông tin cover |
| `GET /manga/{id}/recommendation` | Manga tương tự |
| `GET /manga/random` | Manga ngẫu nhiên |

---

## 1. Điều quan trọng trước khi tích hợp

MangaDex có hai server:

```text
Production: https://api.mangadex.org
Development: https://api.mangadex.dev
```

API dùng JSON và ID của manga/chapter thường là UUID.

MangaDex yêu cầu client có `User-Agent` thật, không giả mạo; chỉ dùng HTTPS; không gửi header `Via`. Tài liệu cũng nói MangaDex không trả CORS cho website bên ngoài và ảnh hotlink trực tiếp từ các domain MangaDex có thể nhận response sai. Vì vậy, với web truyện công khai, kiến trúc đúng là:

```text
Browser của người đọc
        ↓
Backend/proxy của website bạn
        ↓
api.mangadex.org và MangaDex@Home
```

Không nên để browser gọi trực tiếp API/ảnh MangaDex như một cách triển khai chính thức. [3]

### Chính sách sử dụng cần tuân thủ

Tài liệu API chính thức nêu các yêu cầu sau:

- **Phải ghi credit MangaDex.**
- Nếu cho phép đọc chapter, **phải ghi credit nhóm scanlation**.
- **Không được chạy quảng cáo hoặc dịch vụ trả phí** trên website/app sử dụng dịch vụ này.
- Các quy định có thể thay đổi, nên kiểm tra lại tài liệu chính thức trước mỗi lần phát hành. [2]

Đây là ràng buộc quan trọng nếu bạn định làm website truyện thương mại.

## 2. Giới hạn request và phân trang

MangaDex áp dụng giới hạn chung khoảng **5 request/giây/IP** trên toàn `api.mangadex.org`. Vượt giới hạn có thể nhận `429`; nếu tiếp tục gửi request khi đã bị giới hạn, IP có thể bị chặn tạm thời. [3]

Các endpoint collection thường dùng:

```text
limit   số phần tử trả về
        thường tối đa 100; một số feed tối đa 500

offset  vị trí bắt đầu
```

Tài liệu giới hạn tổng collection yêu cầu `offset + limit <= 10.000`. Không nên tải toàn bộ kho bằng cách gọi liên tục; hãy dùng tìm kiếm/lọc đúng mục đích và cache dữ liệu. [3]

Khi endpoint trả rate-limit headers, cần đọc:

```text
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Retry-After
```

## 3. Response chung

Response thành công thường có dạng:

```json
{
  "result": "ok",
  "response": "collection",
  "data": [],
  "limit": 10,
  "offset": 0,
  "total": 123
}
```

Một resource đơn thường có dạng:

```json
{
  "result": "ok",
  "response": "entity",
  "data": {
    "id": "uuid",
    "type": "manga",
    "attributes": {},
    "relationships": []
  }
}
```

Lỗi thường có dạng `ErrorResponse`; luôn kiểm tra HTTP status trước khi đọc dữ liệu.

## 4. Luồng xây web truyện cơ bản

### Bước 1 — Tìm manga

```http
GET /manga?title=one%20piece&limit=20&offset=0&includes[]=cover_art
```

Ví dụ đầy đủ:

```text
https://api.mangadex.org/manga?title=one%20piece&limit=20&offset=0&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&order[relevance]=desc
```

`data[].id` là manga UUID dùng cho các request tiếp theo.

### Bước 2 — Lấy thông tin manga

```http
GET /manga/{mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist
```

Các field hay dùng trong `attributes`:

| Field | Ý nghĩa |
|---|---|
| `title` | object tên theo mã ngôn ngữ |
| `altTitles` | tên thay thế |
| `description` | mô tả theo ngôn ngữ |
| `originalLanguage` | ngôn ngữ gốc |
| `lastVolume` | volume cuối nếu có |
| `lastChapter` | chapter cuối nếu có |
| `year` | năm phát hành |
| `status` | `ongoing`, `completed`, `hiatus`, `cancelled` |
| `contentRating` | `safe`, `suggestive`, `erotica`, `pornographic` |
| `publicationDemographic` | `shounen`, `shoujo`, `josei`, `seinen`, `none` |
| `tags` | danh sách tag |
| `state` | trạng thái dữ liệu |
| `chapterNumbersResetOnNewVolume` | chapter có reset theo volume hay không |

MangaDex dùng cấu trúc quan hệ. `relationships[]` có thể chứa `cover_art`, `author`, `artist`, `scanlation_group` và các loại relation khác.

### Bước 3 — Lấy danh sách chapter của manga

Khuyến nghị dùng feed của manga:

```http
GET /manga/{mangaId}/feed
```

Ví dụ:

```text
https://api.mangadex.org/manga/{MANGA_ID}/feed?limit=100&offset=0&translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive&order[volume]=asc&order[chapter]=asc&includes[]=scanlation_group
```

Tham số quan trọng:

- `translatedLanguage[]`: ngôn ngữ bản dịch, ví dụ `en`, `vi`, `ja`.
- `contentRating[]`: nên gửi rõ mức nội dung bạn cho phép.
- `order[volume]`, `order[chapter]`: `asc` hoặc `desc`.
- `includes[]`: thường dùng `scanlation_group`.
- `offset`, `limit`: phân trang.
- `includeUnavailable=0|1`.
- `includeExternalUrl=0|1`.
- `externalUrl` hoặc `excludeExternalUrl`: lọc chapter có URL ngoài.

Tài liệu mô tả `/manga/{id}/feed` là endpoint lấy feed chapter của một manga và cho phép `limit` tối đa 500, khác với `/chapter` thông thường tối đa 100. [1]

Mỗi chapter thường có:

```json
{
  "id": "chapter-uuid",
  "type": "chapter",
  "attributes": {
    "title": "The Beginning",
    "volume": "1",
    "chapter": "1",
    "translatedLanguage": "en",
    "externalUrl": null,
    "publishAt": "2024-01-01T00:00:00+00:00",
    "readableAt": "2024-01-01T00:00:00+00:00",
    "pages": 20,
    "version": 1
  },
  "relationships": []
}
```

### Bước 4 — Lấy danh sách volume/chapter dạng cây

```http
GET /manga/{mangaId}/aggregate?translatedLanguage[]=en
```

Response có `volumes`, trong mỗi volume có `chapters`. Endpoint này phù hợp để dựng sidebar hoặc dropdown chapter:

```json
{
  "result": "ok",
  "volumes": {
    "1": {
      "volume": "1",
      "count": 12,
      "chapters": {
        "1": {
          "chapter": "1",
          "id": "chapter-uuid",
          "count": 20,
          "others": []
        }
      }
    }
  }
}
```

`others` chứa các chapter thay thế cùng số chapter nếu có.

### Bước 5 — Lấy server đọc ảnh

```http
GET /at-home/server/{chapterId}
```

Đây là endpoint công khai, không yêu cầu Bearer token. Response có dạng:

```json
{
  "result": "ok",
  "baseUrl": "https://some-server.mangadex.network/some-temporary-token",
  "chapter": {
    "hash": "chapter-hash",
    "data": [
      "x1-page-hash.png",
      "x2-page-hash.png"
    ],
    "dataSaver": [
      "x1-page-hash.jpg",
      "x2-page-hash.jpg"
    ]
  }
}
```

URL đọc ảnh được dựng như sau:

```text
Ảnh chất lượng cao:
{baseUrl}/data/{hash}/{filename}

Ảnh data saver:
{baseUrl}/data-saver/{hash}/{filename}
```

Ví dụ:

```text
https://some-server.mangadex.network/some-temporary-token/data/chapter-hash/x1-page-hash.png
```

`baseUrl` chỉ hợp lệ cho chapter được yêu cầu và có thời hạn khoảng **15 phút** theo schema API. Không lưu vĩnh viễn URL này; hãy gọi lại `/at-home/server/{chapterId}` khi hết hạn. [1]

Tham số tùy chọn:

```text
forcePort443=true
```

Dùng khi cần ép chọn MangaDex@Home server chạy cổng HTTPS chuẩn 443.

### Bước 6 — Proxy ảnh qua backend

Không trả URL MangaDex@Home trực tiếp cho browser nếu muốn tuân thủ yêu cầu hotlink/CORS. Backend có thể:

1. Gọi `/at-home/server/{chapterId}`.
2. Lưu `baseUrl`, `hash`, danh sách filename trong cache khoảng vài phút.
3. Tạo route nội bộ như `/reader/{chapterId}/{page}`.
4. Backend tải/stream ảnh từ MangaDex@Home rồi trả về cho frontend.
5. Thêm cache, timeout, rate limit của website bạn.

Không nên tải toàn bộ chapter vào ổ đĩa lâu dài nếu không cần.

## 5. Tìm kiếm manga và bộ lọc

Endpoint chính:

```http
GET /manga
```

### Tham số tìm kiếm

| Tham số | Ý nghĩa |
|---|---|
| `title` | tìm theo tiêu đề |
| `authorOrArtist` | tìm theo author/artist UUID theo schema hiện tại |
| `authors[]` | lọc theo author UUID |
| `artists[]` | lọc theo artist UUID |
| `ids[]` | nhiều manga UUID, tối đa 100/request |
| `year` | năm hoặc `none` |
| `status[]` | `ongoing`, `completed`, `hiatus`, `cancelled` |
| `originalLanguage[]` | ngôn ngữ gốc, ví dụ `ja` |
| `availableTranslatedLanguage[]` | ngôn ngữ bản dịch có sẵn |
| `publicationDemographic[]` | `shounen`, `shoujo`, `josei`, `seinen`, `none` |
| `contentRating[]` | `safe`, `suggestive`, `erotica`, `pornographic` |
| `includedTags[]` | tag UUID cần có |
| `includedTagsMode` | `AND` hoặc `OR` |
| `excludedTags[]` | tag UUID loại trừ |
| `excludedTagsMode` | `AND` hoặc `OR` |
| `hasAvailableChapters` | `0`, `1`, `true`, `false` |
| `hasUnavailableChapters` | `0`, `1`, `true`, `false` |
| `group` | scanlation group UUID |
| `createdAtSince` | thời điểm UTC dạng `YYYY-MM-DDTHH:MM:SS` |
| `updatedAtSince` | thời điểm cập nhật UTC |
| `limit` | mặc định 10, tối đa 100 |
| `offset` | vị trí bắt đầu |

### Sắp xếp

Dùng deep-object query:

```text
order[title]=asc
order[year]=desc
order[latestUploadedChapter]=desc
order[followedCount]=desc
order[relevance]=desc
order[rating]=desc
```

Ví dụ tìm manga có chapter bản dịch tiếng Việt:

```text
/manga?availableTranslatedLanguage[]=vi&hasAvailableChapters=1&contentRating[]=safe&contentRating[]=suggestive&order[latestUploadedChapter]=desc&limit=20
```

### Tag

```http
GET /manga/tag
```

Không cần auth. Response trả tag UUID, tên theo ngôn ngữ, mô tả, nhóm `genre`, `theme` hoặc `format`.

Dùng tag UUID ở `includedTags[]` và `excludedTags[]`.

## 6. Cover art và URL ảnh bìa

Có hai cách lấy cover:

### Include trong manga response

```text
/manga/{id}?includes[]=cover_art
/manga?includes[]=cover_art
```

Từ relationship `cover_art`, lấy `attributes.fileName`.

### Endpoint cover riêng

```http
GET /cover/{mangaOrCoverId}
GET /cover?manga[]={mangaId}
```

URL cover phổ biến:

```text
https://uploads.mangadex.org/covers/{mangaId}/{fileName}
https://uploads.mangadex.org/covers/{mangaId}/{fileName}.256.jpg
https://uploads.mangadex.org/covers/{mangaId}/{fileName}.512.jpg
```

Kích thước suffix có thể gồm `.256.jpg`, `.512.jpg` hoặc ảnh gốc tùy nhu cầu. Nên dùng cover URL trong backend/proxy và cache hợp lý.

## 7. API xác thực

OpenAPI khai báo Bearer authentication:

```http
Authorization: Bearer <token>
```

Các endpoint công khai cho web catalog/reader như `/manga`, `/chapter`, `/manga/{id}/feed`, `/manga/{id}/aggregate`, `/manga/tag`, `/at-home/server/{chapterId}` được schema đánh dấu `security: []`.

### Login

```http
POST /auth/login
Content-Type: application/json
```

Body gồm thông tin đăng nhập theo schema `Login`.

Endpoint login hiện được đánh dấu **deprecated** trong OpenAPI; không nên tự xây hệ thống phụ thuộc vào endpoint này nếu chưa kiểm tra hướng dẫn auth mới nhất.

Các endpoint auth:

```http
POST /auth/login       deprecated trong schema hiện tại
GET  /auth/check
POST /auth/logout
POST /auth/refresh
```

Token refresh dùng body JSON theo schema `RefreshToken`.

### User account

Các tính năng yêu cầu auth gồm:

- Manga follow/unfollow.
- Đọc marker.
- Reading history.
- Reading status.
- Custom list.
- Rating.
- User settings.
- Theo dõi group/user/list.

Không đưa token của tài khoản MangaDex vào frontend. Nếu cần account integration, giữ token ở backend và dùng session của website bạn.

## 8. Theo dõi và trạng thái đọc

### Follow manga

```http
POST   /manga/{id}/follow
DELETE /manga/{id}/follow
GET    /user/follows/manga
GET    /user/follows/manga/{id}
```

### Reading status

```http
GET  /manga/status
GET  /manga/{id}/status
POST /manga/{id}/status
```

Body của update status theo schema `UpdateMangaStatus`, có thể dùng các trạng thái như reading, on_hold, plan_to_read, dropped, re_reading, completed tùy schema hiện hành.

### Read markers

Lấy chapter đã đọc của một manga:

```http
GET /manga/{id}/read
```

Ghi nhiều marker:

```http
POST /manga/{id}/read
Content-Type: application/json
```

Body theo schema `ChapterReadMarkerBatch`. Có thể thêm:

```text
?updateHistory=true
```

Lấy marker của nhiều manga:

```http
GET /manga/read?ids[]={mangaId}&ids[]={mangaId2}&grouped=true
```

## 9. Recommendation và manga random

```http
GET /manga/{id}/recommendation
GET /manga/random
```

`/manga/{id}/recommendation` trả tối đa 20 manga tương tự.

`/manga/random` hỗ trợ filter tag và content rating. Endpoint random có giới hạn riêng theo tài liệu; không gọi liên tục để dựng infinite scroll.

## 10. Chapter endpoint tổng quát

```http
GET    /chapter
GET    /chapter/{id}
PUT    /chapter/{id}
DELETE /chapter/{id}
```

`GET /chapter` hỗ trợ lọc theo:

- `ids[]`
- `title`
- `groups[]`
- `uploader`
- `manga`
- `volume[]`
- `chapter`
- `translatedLanguage[]`
- `originalLanguage[]`
- `excludedOriginalLanguage[]`
- `contentRating[]`
- `excludedGroups[]`
- `excludedUploaders[]`
- `createdAtSince`, `updatedAtSince`, `publishAtSince`
- `externalUrl`, `excludeExternalUrl`
- `includeFutureUpdates`
- `includeEmptyPages`
- `includeFuturePublishAt`
- `includeExternalUrl`
- `includeUnavailable`
- `order[...]`
- `includes[]` với `manga`, `scanlation_group`, `user`

`GET /manga/{id}/feed` thường dễ dùng hơn nếu mục tiêu là chapter của một manga cụ thể.

## 11. Scanlation group, author, artist

### Scanlation group

```http
GET    /group
POST   /group
GET    /group/{id}
PUT    /group/{id}
DELETE /group/{id}
POST   /group/{id}/follow
DELETE /group/{id}/follow
```

`GET /group` hỗ trợ `name`, `ids[]`, `focusedLanguage`, `includes[]`, `order[...]`.

### Author/artist

```http
GET    /author
POST   /author
GET    /author/{id}
PUT    /author/{id}
DELETE /author/{id}
```

`GET /author` hỗ trợ `name`, `ids[]`, `includes[]`, `order[...]`.

## 12. Custom list

```http
POST   /list
GET    /list/{id}
PUT    /list/{id}
DELETE /list/{id}
POST   /list/{id}/follow
DELETE /list/{id}/follow
POST   /manga/{id}/list/{listId}
DELETE /manga/{id}/list/{listId}
GET    /user/list
GET    /user/{id}/list
GET    /list/{id}/feed
```

Đây là danh sách cá nhân hoặc danh sách được chia sẻ. Website riêng có thể dùng database riêng thay vì phụ thuộc hoàn toàn vào custom list của MangaDex.

## 13. Upload/chapter creation

API có nhóm upload cho tài khoản được phép:

```http
GET    /upload
POST   /upload/begin
POST   /upload/begin/{chapterId}
POST   /upload/{uploadSessionId}
DELETE /upload/{uploadSessionId}
POST   /upload/{uploadSessionId}/commit
DELETE /upload/{uploadSessionId}/{uploadSessionFileId}
DELETE /upload/{uploadSessionId}/batch
POST   /upload/check-approval-required
```

Đây là workflow nhiều bước, có rate limit riêng và không nên đưa vào web đọc truyện nếu bạn chỉ cần hiển thị nội dung. Nếu làm nền tảng upload, phải xử lý session, file multipart, commit và moderation approval theo schema OpenAPI.

## 14. Rating, report, statistics

### Rating

```http
GET    /rating?manga[]={mangaId}
POST   /rating/{mangaId}
DELETE /rating/{mangaId}
```

### Report

```http
GET  /report/reasons/{category}
GET  /report
POST /report
```

### Statistics

```http
GET /statistics/chapter/{uuid}
GET /statistics/chapter?chapter[]={uuid}
GET /statistics/group/{uuid}
GET /statistics/group?group[]={uuid}
GET /statistics/manga/{uuid}
GET /statistics/manga?manga[]={uuid}
```

## 15. Mã mẫu JavaScript frontend — chỉ dùng cho dữ liệu nội bộ của backend

Do chính sách CORS của MangaDex, đoạn này phù hợp cho gọi **backend của bạn**, không nên gọi trực tiếp từ browser tới MangaDex production.

```js
// Frontend gọi server của bạn, ví dụ /api/manga.
async function searchManga(title, page = 0) {
  const res = await fetch(
    `/api/manga?title=${encodeURIComponent(title)}&page=${page}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const result = await searchManga("One Piece");
console.log(result.data);
```

Nếu bạn chỉ đang thử API trong môi trường dev, có thể gọi trực tiếp bằng `curl`/Node/PHP có `User-Agent`, nhưng production nên proxy.

## 16. Node.js backend mẫu

Node.js 18+:

```js
// server.mjs
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const MDX = "https://api.mangadex.org";
const USER_AGENT = "MyMangaSite/1.0 (https://example.com/contact)";

const cache = new Map();
const TTL = 60_000;

function buildUrl(path, params = {}) {
  const url = new URL(path, MDX);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function mdxGet(path, params = {}) {
  const url = buildUrl(path, params);
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) return cached.body;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error(`MangaDex returned non-JSON HTTP ${response.status}`); }

  if (!response.ok) {
    const error = new Error(body.errors?.[0]?.detail || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  cache.set(key, { time: Date.now(), body });
  return body;
}

app.get("/api/manga", async (req, res) => {
  try {
    const page = Math.max(0, Number(req.query.page || 0));
    const body = await mdxGet("/manga", {
      title: String(req.query.title || ""),
      limit: 20,
      offset: page * 20,
      "includes[]": ["cover_art"],
      "contentRating[]": ["safe", "suggestive"],
      "order[relevance]": "desc"
    });
    res.json(body);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

app.get("/api/manga/:id/chapters", async (req, res) => {
  try {
    const body = await mdxGet(`/manga/${req.params.id}/feed`, {
      limit: 100,
      offset: Number(req.query.offset || 0),
      "translatedLanguage[]": ["en"],
      "contentRating[]": ["safe", "suggestive"],
      "order[volume]": "asc",
      "order[chapter]": "asc",
      "includes[]": ["scanlation_group"]
    });
    res.json(body);
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

app.get("/api/chapter/:id/pages", async (req, res) => {
  try {
    const body = await mdxGet(`/at-home/server/${req.params.id}`);
    const { baseUrl, chapter } = body;
    const pages = chapter.data.map(file =>
      `${baseUrl}/data/${chapter.hash}/${file}`
    );
    const dataSaverPages = chapter.dataSaver.map(file =>
      `${baseUrl}/data-saver/${chapter.hash}/${file}`
    );
    res.json({ pages, dataSaverPages, expiresSoon: true });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
```

Cài và chạy:

```bash
npm init -y
npm install express
node server.mjs
```

## 17. PHP backend mẫu

PHP 8+ và extension cURL:

```php
<?php
// mangadex.php
declare(strict_types=1);

const MDX_BASE = 'https://api.mangadex.org';
const MDX_USER_AGENT = 'MyMangaSite/1.0 (https://example.com/contact)';

function mdxGet(string $path, array $params = []): array
{
    $url = MDX_BASE . $path;
    $query = [];

    foreach ($params as $key => $value) {
        if (is_array($value)) {
            foreach ($value as $item) {
                $query[] = rawurlencode($key) . '=' . rawurlencode((string)$item);
            }
        } elseif ($value !== null && $value !== '') {
            $query[] = rawurlencode($key) . '=' . rawurlencode((string)$value);
        }
    }

    if ($query) $url .= '?' . implode('&', $query);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: ' . MDX_USER_AGENT,
        ],
    ]);

    $raw = curl_exec($ch);
    if ($raw === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException($error);
    }

    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        throw new RuntimeException("Non-JSON response, HTTP {$status}");
    }
    if ($status < 200 || $status >= 300) {
        $message = $body['errors'][0]['detail'] ?? "HTTP {$status}";
        throw new RuntimeException($message, $status);
    }
    return $body;
}

// Tìm manga
$result = mdxGet('/manga', [
    'title' => 'One Piece',
    'limit' => 10,
    'offset' => 0,
    'includes[]' => ['cover_art'],
    'contentRating[]' => ['safe', 'suggestive'],
    'order[relevance]' => 'desc',
]);

foreach ($result['data'] ?? [] as $manga) {
    echo ($manga['attributes']['title']['en'] ?? 'Untitled') . "\n";
}

// Lấy chapter của một manga
$mangaId = 'PUT-MANGA-UUID-HERE';
$chapters = mdxGet("/manga/{$mangaId}/feed", [
    'limit' => 100,
    'offset' => 0,
    'translatedLanguage[]' => ['en'],
    'contentRating[]' => ['safe', 'suggestive'],
    'order[volume]' => 'asc',
    'order[chapter]' => 'asc',
]);

// Lấy danh sách ảnh của một chapter
$chapterId = 'PUT-CHAPTER-UUID-HERE';
$server = mdxGet("/at-home/server/{$chapterId}");
$base = $server['baseUrl'];
$hash = $server['chapter']['hash'];
$pages = array_map(
    fn(string $file) => "{$base}/data/{$hash}/{$file}",
    $server['chapter']['data'] ?? []
);

print_r($pages);
```

## 18. Proxy ảnh PHP tối giản

Không nên trả URL MangaDex@Home trực tiếp nếu muốn tập trung quyền kiểm soát vào backend. Một proxy production cần cache, giới hạn kích thước và kiểm tra chapter ID. Ví dụ tối giản:

```php
<?php
// image-proxy.php?chapter=...&file=...&hash=...
// Chỉ là khung minh họa; cần thêm allowlist/cache/auth trước khi dùng production.

$chapter = $_GET['chapter'] ?? '';
$file = $_GET['file'] ?? '';
$hash = $_GET['hash'] ?? '';

if (!preg_match('/^[0-9a-f-]{36}$/i', $chapter)) http_response_code(400) && exit('bad chapter');
if (!preg_match('/^[a-zA-Z0-9._-]+$/', $file)) http_response_code(400) && exit('bad file');
if (!preg_match('/^[a-f0-9]{32}$/i', $hash)) http_response_code(400) && exit('bad hash');

// Trong production: lấy baseUrl từ cache bằng chapter ID, không nhận baseUrl tùy ý từ client.
$baseUrl = getCachedAtHomeBaseUrl($chapter); // tự triển khai
$url = $baseUrl . '/data/' . rawurlencode($hash) . '/' . rawurlencode($file);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['User-Agent: MyMangaSite/1.0 (https://example.com/contact)'],
]);
$bytes = curl_exec($ch);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($bytes === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    exit('upstream error');
}

header('Content-Type: ' . ($type ?: 'image/jpeg'));
header('Cache-Control: public, max-age=300');
echo $bytes;
```

## 19. Node.js retry/backoff an toàn

Không retry vô hạn. Với `429`, đọc `Retry-After` nếu có; với `5xx`, retry ít lần với exponential backoff.

```js
async function fetchWithBackoff(url, options = {}, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`HTTP ${response.status}`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30_000, 1000 * 2 ** attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error("MangaDex request failed after retries");
}
```

## 20. Cấu trúc database gợi ý cho web truyện

Không lưu `baseUrl` MangaDex@Home như URL vĩnh viễn. Có thể lưu:

```text
manga
- id (UUID MangaDex)
- title_json
- description_json
- cover_file_name
- content_rating
- status
- updated_at

chapter
- id (UUID MangaDex)
- manga_id
- volume
- chapter
- title
- translated_language
- pages
- published_at
- readable_at
- scanlation_group_id

reader_cache
- chapter_id
- base_url
- hash
- files_json
- expires_at

user_read_marker
- user_id của website bạn
- manga_id
- chapter_id
- read_at
```

Có thể đồng bộ metadata theo lịch thưa, nhưng không nên crawl vô hạn. Khi người dùng mở chapter, lấy AtHome server on-demand và cache ngắn hạn.

## 21. Catalog đầy đủ endpoint theo OpenAPI 5.13.1

Các dòng dưới đây là catalog toàn bộ 80 path hiện có trong schema. `Public` nghĩa là endpoint được schema đánh dấu không cần security; các endpoint còn lại thường cần Bearer token hoặc quyền phù hợp.

### Infrastructure

- `GET /ping` — Ping healthcheck — **Public**

### Manga

- `GET /manga` — Manga list/search — **Public**
- `POST /manga` — Create Manga
- `GET /manga/{id}` — Get Manga — **Public**
- `PUT /manga/{id}` — Update Manga
- `DELETE /manga/{id}` — Delete Manga
- `GET /manga/{id}/aggregate` — Get Manga volumes & chapters — **Public**
- `GET /manga/{id}/recommendation` — Similar Manga Recommendations — **Public**
- `GET /manga/{id}/feed` — Manga feed — **Public**
- `GET /manga/{id}/read` — Manga read markers
- `POST /manga/{id}/read` — Batch read markers
- `GET /manga/read` — Read markers for multiple manga
- `GET /manga/random` — Random Manga — **Public**
- `GET /manga/tag` — Tag list — **Public**
- `GET /manga/status` — All Manga reading status
- `GET /manga/{id}/status` — Manga reading status
- `POST /manga/{id}/status` — Update Manga reading status
- `GET /manga/draft` — Manga drafts
- `GET /manga/draft/{id}` — Specific Manga Draft
- `POST /manga/draft/{id}/commit` — Submit Manga Draft
- `GET /manga/{mangaId}/relation` — Manga relation list — **Public**
- `POST /manga/{mangaId}/relation` — Create Manga relation
- `DELETE /manga/{mangaId}/relation/{id}` — Delete Manga relation

### Chapter

- `GET /chapter` — Chapter list — **Public**
- `GET /chapter/{id}` — Get Chapter — **Public**
- `PUT /chapter/{id}` — Update Chapter
- `DELETE /chapter/{id}` — Delete Chapter

### AtHome

- `GET /at-home/server/{chapterId}` — MangaDex@Home server URL — **Public**

### Cover

- `GET /cover` — CoverArt list — **Public**
- `GET /cover/{mangaOrCoverId}` — Get Cover — **Public**
- `POST /cover/{mangaOrCoverId}` — Upload Cover
- `PUT /cover/{mangaOrCoverId}` — Edit Cover
- `DELETE /cover/{mangaOrCoverId}` — Delete Cover

### Author

- `GET /author` — Author list — **Public**
- `GET /author/{id}` — Get Author — **Public**
- `POST /author` — Create Author
- `PUT /author/{id}` — Update Author
- `DELETE /author/{id}` — Delete Author

### ScanlationGroup

- `GET /group` — Scanlation Group list — **Public**
- `GET /group/{id}` — Get Scanlation Group — **Public**
- `POST /group` — Create Scanlation Group
- `PUT /group/{id}` — Update Scanlation Group
- `DELETE /group/{id}` — Delete Scanlation Group
- `POST /group/{id}/follow` — Follow Scanlation Group
- `DELETE /group/{id}/follow` — Unfollow Scanlation Group

### Authentication

- `POST /auth/login` — Login; deprecated trong schema hiện tại
- `GET /auth/check` — Check token permissions
- `POST /auth/logout` — Logout
- `POST /auth/refresh` — Refresh token

### Account / User / Follows

- `GET /user/me` — Logged User details
- `GET /user` — User list
- `GET /user/{id}` — Get User
- `DELETE /user/{id}` — Delete User
- `POST /user/delete/{code}` — Approve User deletion
- `GET /user/follows/group` — Followed groups
- `GET /user/follows/group/{id}` — Check group follow
- `GET /user/follows/user` — Followed users
- `GET /user/follows/user/{id}` — Check user follow
- `GET /user/follows/manga` — Followed manga
- `GET /user/follows/manga/{id}` — Check manga follow
- `GET /user/follows/list` — Followed custom lists
- `GET /user/follows/list/{id}` — Check custom-list follow
- `GET /user/list` — Logged user custom lists
- `GET /user/{id}/list` — User custom lists
- `GET /user/history` — Reading history
- `GET /user/follows/manga/feed` — Followed manga chapter feed

### CustomList

- `POST /list` — Create CustomList
- `GET /list/{id}` — Get CustomList
- `PUT /list/{id}` — Update CustomList
- `DELETE /list/{id}` — Delete CustomList
- `POST /list/{id}/follow` — Follow CustomList
- `DELETE /list/{id}/follow` — Unfollow CustomList
- `POST /manga/{id}/list/{listId}` — Add Manga to CustomList
- `DELETE /manga/{id}/list/{listId}` — Remove Manga from CustomList
- `GET /list/{id}/feed` — CustomList Manga feed

### Upload

- `GET /upload` — Current upload session
- `POST /upload/begin` — Start upload session
- `POST /upload/begin/{chapterId}` — Start edit chapter session
- `POST /upload/{uploadSessionId}` — Upload image files
- `DELETE /upload/{uploadSessionId}` — Abandon upload session
- `POST /upload/{uploadSessionId}/commit` — Commit upload session
- `DELETE /upload/{uploadSessionId}/{uploadSessionFileId}` — Delete uploaded file
- `DELETE /upload/{uploadSessionId}/batch` — Delete uploaded files batch
- `POST /upload/check-approval-required` — Check moderation approval

### Rating / Report / Captcha

- `GET /rating` — Get own ratings
- `POST /rating/{mangaId}` — Create/update rating
- `DELETE /rating/{mangaId}` — Delete rating
- `GET /report/reasons/{category}` — Report reasons
- `GET /report` — User reports
- `POST /report` — Create report
- `POST /captcha/solve` — Solve reCAPTCHA workflow

### Statistics

- `GET /statistics/chapter/{uuid}` — Chapter statistics
- `GET /statistics/chapter` — Statistics for chapters
- `GET /statistics/group/{uuid}` — Group statistics
- `GET /statistics/group` — Statistics for groups
- `GET /statistics/manga/{uuid}` — Manga statistics
- `GET /statistics/manga` — Statistics for manga

### Settings / Forums / Legacy

- `GET /settings/template` — Latest settings template
- `POST /settings/template` — Create settings template
- `GET /settings/template/{version}` — Settings template by version
- `GET /settings` — User settings
- `POST /settings` — Create/update user settings
- `POST /forums/thread` — Create forum thread
- `POST /legacy/mapping` — Legacy ID mapping

## 22. Checklist triển khai

- [ ] Dùng `https://api.mangadex.org` và một `User-Agent` có tên app + URL liên hệ.
- [ ] Gọi API từ backend, không phụ thuộc CORS trực tiếp.
- [ ] Proxy ảnh MangaDex@Home thay vì hotlink trực tiếp.
- [ ] Cache manga metadata, tag, cover và feed trong thời gian hợp lý.
- [ ] Cache AtHome server ngắn hạn, vì `baseUrl` hết hạn.
- [ ] Giới hạn `limit`, phân trang với `offset`.
- [ ] Xử lý `429`, `403`, `404` và đọc `Retry-After`.
- [ ] Lọc `contentRating` rõ ràng.
- [ ] Hiển thị credit MangaDex và scanlation group.
- [ ] Không chạy quảng cáo/dịch vụ trả phí nếu vẫn dùng MangaDex theo chính sách hiện tại.
- [ ] Không đưa Bearer token vào frontend.
- [ ] Kiểm tra lại OpenAPI trước khi triển khai chức năng auth/upload.

## References

[1]: https://api.mangadex.org/docs/static/api.yaml "MangaDex official OpenAPI specification 5.13.1"
[2]: https://api.mangadex.org/docs/ "MangaDex API documentation and acceptable use policy"
[3]: https://api.mangadex.org/docs/2-limitations/ "MangaDex API limitations and requirements"
[4]: https://api.mangadex.org/docs/swagger.html "MangaDex official Swagger UI"
