/**
 * Máy chủ production cho phần giao diện.
 *
 * `next start` chỉ nén gzip, còn Brotli nhỏ hơn đáng kể trên JavaScript/CSS.
 * Máy chủ này nhận các yêu cầu tới file tĩnh trong /_next/static, trả bản .br
 * đã nén sẵn nếu trình duyệt hỗ trợ, rồi chuyển mọi yêu cầu còn lại (HTML, RSC,
 * ảnh) cho Next xử lý.
 *
 * Chạy sau `npm run build` và `node scripts/precompress.mjs`:
 *   node scripts/serve.mjs
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import next from 'next';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(root, 'client', '.next', 'static');
const port = Number(process.env.PORT || 3000);
// Mặc định là production để không phải cài cross-env khi triển khai.
// Chạy phát triển thì đặt NODE_ENV=development.
const dev = process.env.NODE_ENV === 'development';

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Kiểm tra client có chấp nhận một kiểu nén không, kể cả dạng `gzip;q=0, br`.
 * Trả về chuỗi mã hoá tương ứng, hoặc null nếu client không chấp nhận.
 */
function pickEncoding(header) {
  if (!header) return null;

  const quality = new Map();
  for (const part of header.split(',')) {
    const [token, ...params] = part.trim().split(';');
    if (!token) continue;
    const q = params
      .map((p) => p.trim())
      .find((p) => p.startsWith('q='));
    quality.set(token.trim().toLowerCase(), q ? Number(q.slice(2)) : 1);
  }

  // Brotli nhỏ hơn gzip nên được ưu tiên khi cả hai đều được chấp nhận.
  for (const encoding of ['br', 'gzip']) {
    const q = quality.get(encoding);
    if (q !== undefined && q > 0) return encoding;
  }
  return null;
}

/**
 * Phục vụ một tệp trong thư mục .next/static, ưu tiên bản .br.
 * Trả về true nếu đã phục vụ xong, false nếu không có tệp đó.
 */
async function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return false;
  }

  // staticDir đã trỏ sẵn tới client/.next/static, nên phải bỏ tiền tố
  // /_next/static khỏi đường dẫn trước khi nối, nếu không sẽ dựng ra
  // .next/static/_next/static/... và không tìm thấy tệp.
  const prefix = '/_next/static/';
  if (!pathname.startsWith(prefix)) return false;

  // Chặn trường hợp trườn ra ngoài thư mục tĩnh (ví dụ "../../.env")
  const relativePath = normalize(pathname.slice(prefix.length)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(staticDir, relativePath);
  if (!filePath.startsWith(staticDir)) return false;

  const type = MIME[extname(filePath).toLowerCase()];
  if (!type) return false;

  // Ưu tiên bản nén nhỏ nhất mà client chấp nhận: .br, rồi .gz, cuối cùng bản gốc.
  const encoding = pickEncoding(req.headers['accept-encoding']);
  const suffix = encoding === 'br' ? '.br' : encoding === 'gzip' ? '.gz' : null;

  let target = filePath;
  let contentEncoding = null;
  if (suffix) {
    try {
      await stat(`${filePath}${suffix}`);
      target = `${filePath}${suffix}`;
      contentEncoding = encoding;
    } catch {
      // Không có bản nén tương ứng thì trả bản gốc, không gắn Content-Encoding.
      target = filePath;
    }
  }

  let info;
  try {
    info = await stat(target);
  } catch {
    return false;
  }
  if (!info.isFile()) return false;

  const headers = {
    'Content-Type': type,
    // Tên tệp trong .next/static có gắn content-hash, nên cache vô hạn là an toàn.
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  if (contentEncoding) {
    headers['Content-Encoding'] = contentEncoding;
    headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = info.size;

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(target).pipe(res);
  return true;
}

const app = next({ dev, dir: join(root, 'client') });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  serveStatic(req, res)
    .then((served) => {
      if (!served) handle(req, res);
    })
    .catch(() => handle(req, res));
}).listen(port, () => {
  console.log(`[giao diện] Sẵn sàng tại http://localhost:${port}`);
  console.log(`[giao diện] Chế độ: ${dev ? 'phát triển' : 'sản xuất (Brotli)'}`);
});
