/**
 * Nén sẵn toàn bộ file tĩnh của Next thành hai bản: Brotli (.br) và gzip (.gz)
 * để phục vụ khi chạy production.
 *
 * Vì sao cần bước này: `next start` chỉ nén gzip. Dù đã có gzip, Brotli vẫn
 * nhỏ hơn đáng kể trên JavaScript/CSS. Nén cả hai định dạng để không làm hỏng
 * các trình duyệt chỉ hỗ trợ gzip — máy chủ sẽ chọn .br nếu có, không thì .gz.
 *
 * Chạy sau khi đã `npm run build`:
 *   node scripts/precompress.mjs
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(root, 'client', '.next', 'static');

/**
 * Chỉ nén những kiểu tệp thực sự là văn bản. Ảnh, font đã nén sẵn, nén thêm
 * chỉ tốn CPU mà không giảm thêm byte nào.
 */
const COMPRESSIBLE = new Set(['.js', '.css', '.svg', '.html', '.json', '.txt', '.map', '.webmanifest']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function main() {
  try {
    await stat(staticDir);
  } catch {
    console.error('Chưa có client/.next/static — hãy chạy `npm run build` trước.');
    process.exit(1);
  }

  let before = 0;
  let afterBrotli = 0;
  let afterGzip = 0;
  let count = 0;

  for await (const file of walk(staticDir)) {
    // Bỏ qua chính các tệp .br/.gz tạo ra từ lần chạy trước.
    if (file.endsWith('.br') || file.endsWith('.gz')) continue;
    if (!COMPRESSIBLE.has(extname(file))) continue;

    const original = await readFile(file);
    before += original.length;
    count += 1;

    const brotli = await compressBrotli(original, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: original.length,
      },
    });
    await writeFile(`${file}.br`, brotli);
    afterBrotli += brotli.length;

    const gzipped = await compressGzip(original, { level: 9 });
    await writeFile(`${file}.gz`, gzipped);
    afterGzip += gzipped.length;
  }

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  const saved = (n) => (before > 0 ? (100 - (n / before) * 100).toFixed(1) : '0');

  console.log(`Đã nén ${count} tệp tĩnh`);
  console.log(`  Gốc     ${kb(before)}`);
  console.log(`  Brotli  ${kb(afterBrotli)}  (tiết kiệm ${saved(afterBrotli)}%)`);
  console.log(`  gzip    ${kb(afterGzip)}  (tiết kiệm ${saved(afterGzip)}%)`);
  console.log(`  ${relative(root, staticDir)}/**/*.{br,gz}`);
}

main().catch((error) => {
  console.error('Lỗi nén:', error.message);
  process.exit(1);
});
