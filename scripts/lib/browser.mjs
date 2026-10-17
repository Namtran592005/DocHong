/**
 * Tiện ích dùng chung cho các script cần mở Edge/Chrome ở chế độ headless.
 *
 * Edge không khởi động được nếu hồ sơ mặc định nằm trên ổ hệ thống bị đầy, nên
 * các script tạo một thư mục hồ sơ riêng. Thư mục đó khá nặng (hơn 16 MB), nên
 * `cleanup()` sẽ xoá nó khi script kết thúc — nếu không, mỗi lần chạy lại
 * lại chất thêm dung lượng vào ổ đĩa.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

/** Cổng gỡ lỗi từ xa; tránh các cổng Windows thường giữ lại. */
export const DEBUG_PORT = 9444;

export function findBrowser() {
  return BROWSERS.find((path) => existsSync(path)) ?? null;
}

/**
 * Thư mục hồ sơ trình duyệt cho lần chạy này. Đặt trong thư mục dự án để không
 * phụ thuộc thư mục tạm hệ thống, rồi xoá sau khi dùng.
 */
export function createProfile() {
  const dir = process.env.EDGE_PROFILE || join(root, '.edge-profile');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Chạy trình duyệt headless với hồ sơ riêng. */
export function launchBrowser(profileDir) {
  return spawn(
    findBrowser(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
}

/**
 * Đóng trình duyệt và xoá thư mục hồ sơ.
 * Gọi trong `finally` để không sót lại kể cả khi script lỗi giữa chừng.
 */
export async function cleanup(child, profileDir) {
  try {
    child?.kill();
  } catch {
    /* tiến trình đã kết thúc */
  }
  // Chờ Edge nhả tệp trước khi xoá, nếu không Windows sẽ giữ khoá.
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!profileDir || profileDir.startsWith(root)) {
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
