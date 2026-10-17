/**
 * Đóng gói bản phát hành để mang đi máy khác.
 *
 * Bản build này tự chứa mọi thứ cần để chạy: mã nguồn proxy, bản build của
 * giao diện (kèm file nén Brotli/gzip), và đúng những gói phụ thuộc cần lúc
 * chạy — không kèm TypeScript, ESLint, sharp hay ảnh chụp màn hình.
 *
 * Chạy sau khi đã `npm run build`:
 *   node scripts/build-release.mjs
 *
 * Kết quả nằm ở thư mục `release/`.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'release');

/** Các lệnh chỉ dùng khi phát triển, không cần trong bản phát hành. */
const DEV_ONLY_SCRIPTS = new Set([
  'dev',
  'dev:client',
  'dev:server',
  'build',
  'precompress',
  'logo',
  'screenshots',
  'measure',
  'check:images',
]);

const FILES = [
  ['package-lock.json', 'package-lock.json'],
  ['client/next.config.ts', 'client/next.config.ts'],
  ['client/public', 'client/public'],
  ['client/.env.example', 'client/.env.example'],
  ['client/.next', 'client/.next'],
  ['server/src', 'server/src'],
  ['server/.env.example', 'server/.env.example'],
  ['scripts/serve.mjs', 'scripts/serve.mjs'],
  ['scripts/start.mjs', 'scripts/start.mjs'],
];

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    // Không dùng shell: trên Windows, shell:true làm lộ cảnh báo bảo mật và
    // có thể sai với đường dẫn chứa khoảng trắng.
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} kết thúc với mã ${code}`));
    });
  });
}

async function writePackageJson(dir, source, dropDevDeps) {
  const data = JSON.parse(await readFile(join(root, source), 'utf8'));

  const scripts = {};
  for (const [name, command] of Object.entries(data.scripts ?? {})) {
    if (!DEV_ONLY_SCRIPTS.has(name)) scripts[name] = command;
  }
  data.scripts = scripts;

  if (dropDevDeps) {
    delete data.devDependencies;
  }

  await writeFile(join(outDir, dir, 'package.json'), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  try {
    await readFile(join(root, 'client', '.next', 'BUILD_ID'));
  } catch {
    console.error('Chưa có bản build. Hãy chạy `npm run build` trước.');
    process.exit(1);
  }

  console.log('Đang dọn thư mục release cũ...');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const [from, to] of FILES) {
    await mkdir(join(outDir, dirname(to)), { recursive: true });
    await cp(join(root, from), join(outDir, to), { recursive: true });
    console.log(`  + ${to}`);
  }

  await writePackageJson('.', 'package.json', true);
  console.log('  + package.json (đã bỏ lệnh phát triển)');
  await writePackageJson('client', 'client/package.json', true);
  console.log('  + client/package.json');
  await writePackageJson('server', 'server/package.json', false);
  console.log('  + server/package.json');

  await writeFile(join(outDir, 'HUONG-DAN.txt'), DEPLOY_GUIDE, 'utf8');
  console.log('  + HUONG-DAN.txt');

  console.log('\nĐang cài gói phụ thuộc lúc chạy (bỏ gói phát triển)...');
  // Dùng thư mục tạm hệ thống thay vì thư mục trong dự án: cache npm chỉ là
  // bộ đệm tải gói, tự xoá được, và không nên nằm lại trong dự án (mỗi lần
  // đóng gói chất thêm tới 88 MB).
  const cache = join(tmpdir(), `dochong-npm-cache-${process.pid}`);
  await mkdir(cache, { recursive: true });

  try {
    // Truyền --cache để không phụ thuộc cấu hình npm của máy: bản cài Node
    // portable có thể trỏ cache sang ổ đã đầy và cài sẽ hỏng.
    //
    // Trên Windows, npm là một tệp .cmd nên không spawn trực tiếp được nếu
    // không bật shell. Gọi npm-cli.js bằng chính Node thay cho đó.
    const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    try {
      await readFile(npmCli);
      await run(
        process.execPath,
        [npmCli, 'install', '--omit=dev', '--no-audit', '--no-fund', '--cache', cache],
        outDir,
      );
    } catch {
      console.warn(`  Không tìm thấy ${npmCli}, thử gọi npm trực tiếp...`);
      await run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--cache', cache], outDir);
    }
  } finally {
    await rm(cache, { recursive: true, force: true }).catch(() => {});
  }

  console.log('\nXong. Bản phát hành nằm ở thư mục release/.');
}

const DEPLOY_GUIDE = `CACH CHAY BAN PHAT HANH
=========================

YEU CAU
  Node.js 20 tro len.

BUOC 1: TAO FILE CAU HINH
  Sao chep server/.env.example thanh server/.env, roi sua it nhat dong:

    MANGADEX_USER_AGENT=DocHong/1.0 (+https://tenmiencuaban)

  MangaDex bat buoc User-Agent that kem dia chi lien he. Bat buoc doi
  dong nay truoc khi dua website len mang.

  Cac bien khai bao day la tuy chon, xem trong file .env.example.

BUOC 2: CHAY
  node scripts/start.mjs

  Website:            http://localhost:3000
  Proxy MangaDex:     http://localhost:4000

  Hoac dung lenh:
    npm start

BUOC 3: THANH DOI TEN MIEN
  Khong can cau hinh gi them. Website tu doc ten mien tu tung request
  nen chay duoc tren bat ky dia chi nao.

  Neu proxy dat o may khac (khac may web), them dong nay vao client/.env:

    NEXT_PUBLIC_API_ORIGIN=http://dia-chi-may-proxy:4000

BAN NEN BIET
  - File nen san Brotli/gzip da nam san trong client/.next/static.
    Hay dung scripts/serve.mjs (chinh la lenh tren), dung chay
    "next start" vi lenh do chi nen gzip.
  - File client/.next chua ma build cua Next.js. KHONG duoc xoa neu
    chay lai lenh nay, muon build lai thi dung ban day du tren Git.
  - Khong can tep .env.example cua client neu proxy chay cung may.

LIEN HE
  Telegram: https://t.me/namtran5905
`;

main().catch((error) => {
  console.error('Lỗi:', error.message);
  process.exit(1);
});
