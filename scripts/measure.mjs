/**
 * Đo trọng lượng tải về của một trang: HTML, JavaScript, CSS và ảnh bìa.
 * Chạy: node scripts/measure.mjs /duong-dan
 */
import http from 'node:http';
import zlib from 'node:zlib';

/** Chỉ mã hoá ký tự thô, giữ nguyên các chuỗi %XX đã có sẵn. */
function sanitizePath(path) {
  return path.replace(/[^!-~]|[\s"'<>\\^`{|}]/g, (ch) =>
    encodeURIComponent(ch),
  );
}

function fetchRaw(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      // Đường dẫn lấy từ HTML có thể còn ký tự chưa mã hoá (ví dụ dấu &)
      // Không dùng encodeURI: URL next/image đã có %2F sẵn, encodeURI sẽ mã
      // hoá kép thành %252F khiến server trả 400. Chỉ thay ký tự thô thực sự
      // không hợp lệ trong đường dẫn.
      { host: 'localhost', port: 3000, path: sanitizePath(path), method: 'GET', headers },
      (res) => {
        const chunks = [];
        let bytes = 0;
        res.on('data', (chunk) => {
          bytes += chunk.length;
          chunks.push(chunk);
        });
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let text = buffer.toString('utf8');
          if (res.headers['content-encoding'] === 'gzip') {
            try {
              text = zlib.gunzipSync(buffer).toString('utf8');
            } catch {
              /* giữ nguyên */
            }
          }
          resolve({ bytes, headers: res.headers, text });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const GZ = { 'Accept-Encoding': 'gzip' };
const kb = (n) => `${(n / 1024).toFixed(1).padStart(8)} KB`;

async function measure(page) {
  const html = await fetchRaw(page, GZ);
  const body = html.text;

  const unique = (re) => [...new Set([...body.matchAll(re)].map((m) => m[0]))];
  const js = unique(/\/_next\/static\/chunks\/[^"']+\.js/g);
  const css = unique(/\/_next\/static\/css\/[^"']+\.css/g);
  // Chỉ lấy src= của thẻ <img>. Không lấy srcset vì srcset là danh sách
  // ứng viên ngăn cách bằng dấu phẩy, sẽ đếm trùng và tính sai tổng.
  const imgs = [
    ...new Set(
      [...body.matchAll(/<img[^>]*\ssrc="(\/_next\/image\?url=[^"]+)"/g)].map((m) =>
        m[1].replace(/&amp;/g, '&'),
      ),
    ),
  ];

  let jsBytes = 0;
  for (const u of js) jsBytes += (await fetchRaw(u, GZ)).bytes;

  let cssBytes = 0;
  for (const u of css) cssBytes += (await fetchRaw(u, GZ)).bytes;

  // Đo vài ảnh đầu rồi nhân với tổng số ảnh trên trang.
  const sample = imgs.slice(0, 8);
  let sampleBytes = 0;
  for (const u of sample) sampleBytes += (await fetchRaw(u, GZ)).bytes;
  const avg = sample.length ? sampleBytes / sample.length : 0;
  const imgBytes = avg * imgs.length;

  const total = html.bytes + jsBytes + cssBytes + imgBytes;

  console.log(`\n${page}`);
  console.log(`  HTML ${kb(html.bytes)}  (${js.length} JS · ${css.length} CSS · ${imgs.length} ảnh)`);
  console.log(`  JS   ${kb(jsBytes)}`);
  console.log(`  CSS  ${kb(cssBytes)}`);
  console.log(`  Ảnh  ${kb(imgBytes)}   (trung bình ${(avg / 1024).toFixed(1)} KB/ảnh)`);
  console.log(`  ${'-'.repeat(38)}`);
  console.log(`  TỔNG ${kb(total)}`);
  console.log(
    `  → ảnh ${((imgBytes / total) * 100).toFixed(0)}% · JS ${((jsBytes / total) * 100).toFixed(0)}%`,
  );

  return { total, imgBytes, jsBytes };
}

const pages = process.argv.slice(2);
const list = pages.length ? pages : ['/', '/tim-kiem?sort=rating', '/truyen/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0'];

const results = [];
for (const page of list) results.push(await measure(page));

const sum = results.reduce(
  (acc, r) => ({
    total: acc.total + r.total,
    img: acc.img + r.imgBytes,
    js: acc.js + r.jsBytes,
  }),
  { total: 0, img: 0, js: 0 },
);

console.log(`\n${'='.repeat(40)}`);
console.log(`TỔNG ${list.length} trang: ${kb(sum.total).trim()}`);
console.log(`  ảnh ${kb(sum.img).trim()} (${((sum.img / sum.total) * 100).toFixed(0)}%)`);
console.log(`  JS  ${kb(sum.js).trim()} (${((sum.js / sum.total) * 100).toFixed(0)}%)`);