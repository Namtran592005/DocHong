/**
 * Chụp ảnh màn hình website bằng Chrome DevTools Protocol (Edge/Chrome headless).
 *
 * Dùng CDP thay vì cờ `--window-size` của dòng lệnh, vì cờ đó tính cả khung cửa
 * sổ và sẽ cho ra ảnh bị lệch tỉ lệ so với CSS pixel thật.
 *
 * Chạy (cần website đang chạy ở http://localhost:3000):
 *   node scripts/screenshots.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEBUG_PORT as PORT, cleanup, createProfile, findBrowser, launchBrowser } from './lib/browser.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'screenshots');

const BASE = process.env.SCREENSHOT_BASE || 'http://localhost:3000';

/**
 * Ảnh trong README hiển thị ở khoảng 600–700 px, nên chụp ở mật độ 1× là đủ
 * mà dung lượng giảm rất nhiều (mỗi ảnh từ 3–4 MB xuống còn vài trăm KB).
 */
const SCALE = Number(process.env.SCREENSHOT_SCALE || 1);

const shots = [
  { name: 'trang-chu', path: '/', width: 1440, height: 1000 },
  { name: 'bang-xep-hang', path: '/tim-kiem?sort=followedCount', width: 1440, height: 1000 },
  { name: 'danh-gia-cao', path: '/tim-kiem?sort=rating', width: 1440, height: 1000 },
  { name: 'chi-tiet-truyen', path: '/truyen/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0', width: 1440, height: 1000 },
  { name: 'trang-doc', path: '/doc/d9109fa8-8fc7-48ee-b6ca-43f979edd4d1', width: 1440, height: 1000 },
  { name: 'the-loai', path: '/tim-kiem?view=genres', width: 1440, height: 1000 },
  { name: 'tim-kiem-loc', path: '/tim-kiem?status=ongoing&lang=vi', width: 1440, height: 1000 },
  { name: 'lien-he', path: '/lien-he', width: 1440, height: 1000 },
  { name: 'mobile-trang-chu', path: '/', width: 390, height: 844 },
  { name: 'mobile-tim-kiem', path: '/tim-kiem', width: 390, height: 844 },
  { name: 'mobile-trang-doc', path: '/doc/d9109fa8-8fc7-48ee-b6ca-43f979edd4d1', width: 390, height: 844 },
];

function cdp(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* trình duyệt chưa sẵn sàng */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Không kết nối được trình duyệt');
}

async function main() {
  if (!findBrowser()) {
    console.error('Không tìm thấy Edge hoặc Chrome để chụp ảnh.');
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  const profileDir = createProfile();
  const child = launchBrowser(profileDir);

  let ws;
  try {
    const wsUrl = await waitForDebugger();
    ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

    console.log(`Chụp ảnh từ ${BASE}\n`);

    for (const shot of shots) {
      const { targetId } = await cdp(ws, 'Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp(ws, 'Target.attachToTarget', { targetId, flatten: true });

      const mobile = shot.width < 700;
      await cdp(ws, 'Emulation.setDeviceMetricsOverride', {
        width: shot.width,
        height: shot.height,
        deviceScaleFactor: SCALE,
        mobile,
        screenWidth: shot.width,
        screenHeight: shot.height,
      }, sessionId);

      await cdp(ws, 'Page.enable', {}, sessionId);
      await cdp(ws, 'Page.navigate', { url: `${BASE}${shot.path}` }, sessionId);
      // Trang xếp hạng gọi proxy hai lần (danh sách + thống kê), nên cần chờ lâu
      // hơn cho lần chụp đầu khi bộ nhớ đệm còn trống.
      await new Promise((r) => setTimeout(r, 12_000));

      const { data } = await cdp(ws, 'Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      }, sessionId);

      const file = join(outDir, `${shot.name}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));

      console.log(`  ✓ ${shot.name.padEnd(20)} ${shot.width}×${shot.height}`);
      await cdp(ws, 'Target.closeTarget', { targetId });
    }
  } finally {
    ws?.close();
    await cleanup(child, profileDir);
  }

  console.log(`\nẢnh nằm trong ${outDir}`);
}

main().catch((error) => {
  console.error('Lỗi:', error.message);
  process.exit(1);
});