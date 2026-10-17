/**
 * Sinh bộ logo và icon từ logo.webp trong thư mục docs.
 *
 * Chạy: node scripts/generate-logo.mjs
 *
 * File gốc là một khối vuông 1254×1254, nặng hơn 800 KB — quá nặng cho favicon
 * và header. Script này cắt sẵn các kích thước phổ biến để trang nhanh hơn.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'docs', 'logo.webp');
const publicDir = join(root, 'client', 'public');

/** Nền trong suốt để icon không bị nền đen khi hiển thị trên tab tối. */
const outputs = [
  // Logo dùng trực tiếp trên trang — PNG cho tương thích rộng nhất
  { file: 'logo.png', width: 256, format: 'png' },
  { file: 'logo.webp', width: 256, format: 'webp', quality: 86 },
  // Logo to dùng cho Open Graph
  { file: 'logo-og.png', width: 512, format: 'png' },
  // Favicon và PWA icons — PNG để trình duyệt hiểu rộng nhất
  { file: 'favicon-64.png', width: 64, format: 'png' },
  { file: 'icon-32.png', width: 32, format: 'png' },
  { file: 'icon-192.png', width: 192, format: 'png' },
  { file: 'icon-512.png', width: 512, format: 'png' },
  { file: 'apple-touch-icon.png', width: 180, format: 'png' },
];

/**
 * Ở kích thước 32–40 px, toàn bộ logo (nhân vật + dòng chữ) thành một vệt nhoè
 * không đọc được. Nên tách riêng phần nhân vật làm "mark" cho header.
 * Vùng cắt 200,90 → 720×540 lấy đúng phần mũ và khuôn mặt.
 */
const MARK = { left: 200, top: 90, width: 720, height: 540 };
const markOutputs = [
  { file: 'logo-mark.png', width: 288, format: 'png' },
  { file: 'logo-mark.webp', width: 288, format: 'webp', quality: 88 },
];

async function main() {
  await mkdir(publicDir, { recursive: true });

  const meta = await sharp(source).metadata();
  console.log(`Nguồn: logo.webp — ${meta.width}×${meta.height}\n`);

  await buildFull(meta);
  await buildMark();

  console.log('\nHoàn tất. Các tệp nằm trong client/public');
}

async function buildFull(meta) {
  for (const target of outputs) {
    let pipeline = sharp(source)
      // Cắt về đúng tỉ lệ vuông để không méo khi đổi kích thước
      .resize({ width: target.width, height: target.width, fit: 'cover', position: 'centre' });

    if (target.format === 'webp') {
      pipeline = pipeline.webp({ quality: target.quality, effort: 6 });
    } else {
      pipeline = pipeline.png({ compressionLevel: 9, quality: 90 });
    }

    const buffer = await pipeline.toBuffer();
    await writeFile(join(publicDir, target.file), buffer);
    console.log(`  ${target.file.padEnd(22)} ${String(target.width).padStart(4)}px  ${(buffer.length / 1024).toFixed(1)} KB`);
  }

  console.log(`\nĐã ghi ${outputs.length} tệp logo đầy đủ vào client/public`);
}

/** Cắt phần nhân vật, dùng làm logo nhỏ ở header. */
async function buildMark() {
  for (const target of markOutputs) {
    let pipeline = sharp(source).extract(MARK);

    const height = Math.round((target.width * MARK.height) / MARK.width);
    pipeline = pipeline.resize({ width: target.width, height, fit: 'cover' });

    pipeline =
      target.format === 'webp'
        ? pipeline.webp({ quality: 88, effort: 6 })
        : pipeline.png({ compressionLevel: 9, palette: true, quality: 92 });

    const buffer = await pipeline.toBuffer();
    await writeFile(join(publicDir, target.file), buffer);
    console.log(
      `  ${target.file.padEnd(22)} ${String(target.width).padStart(4)}px  ${(buffer.length / 1024).toFixed(1)} KB`,
    );
  }
  console.log('\nĐã ghi logo mark (phần nhân vật)');
}

main().catch((error) => {
  console.error('Không sinh được logo:', error.message);
  process.exit(1);
});