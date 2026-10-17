/**
 * Đếm ảnh nằm trong khung nhìn đầu tiên nhưng lại được đánh dấu lazy.
 *
 * Đây chính là nguồn gốc cảnh báo "Intervention: Images loaded lazily and
 * replaced with placeholders" của Edge: trình duyệt thấy ảnh lazy nằm ngay
 * trong khung nhìn nên phải hoãn việc tải rồi thay bằng khung giữ chỗ.
 *
 * Chạy (cần website ở http://localhost:3000):
 *   node scripts/check-lazy-viewport.mjs [đường-dẫn] [chiều-rộng] [chiều-cao]
 */
import { DEBUG_PORT as PORT, cleanup, createProfile, findBrowser, launchBrowser } from './lib/browser.mjs';

const target = process.argv[2] || '/';
const width = Number(process.argv[3] || 1440);
const height = Number(process.argv[4] || 1000);
const url = `http://localhost:3000${target}`;

if (!findBrowser()) {
  console.error('Không tìm thấy trình duyệt.');
  process.exit(1);
}

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
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* chưa sẵn sàng */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Không kết nối được trình duyệt');
}

const profileDir = createProfile();
const child = launchBrowser(profileDir);

let ws;
try {
  const wsUrl = await waitForDebugger();
  ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

  const { targetId } = await cdp(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp(ws, 'Target.attachToTarget', { targetId, flatten: true });

  await cdp(
    ws,
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: width < 700 },
    sessionId,
  );

  await cdp(ws, 'Page.enable', {}, sessionId);
  await cdp(ws, 'Page.navigate', { url }, sessionId);
  // Trang xếp hạng gọi proxy hai lần, cần chờ lâu cho lần tải đầu.
  await new Promise((r) => setTimeout(r, 12_000));

  const expression = `(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out = { total: 0, lazyInView: 0, eagerInView: 0, samples: [] };
    for (const img of document.querySelectorAll('img')) {
      const rect = img.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      out.total++;
      // Phải cắt cả hai chiều: kệ cuộn ngang có ảnh nằm trong chiều cao
      // khung nhìn nhưng đã cuộn ra ngoài chiều ngang, ảnh đó không gây cảnh báo.
      const visible = rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;
      if (!visible) continue;
      const lazy = img.getAttribute('loading') === 'lazy';
      if (lazy) {
        out.lazyInView++;
        if (out.samples.length < 4) {
          out.samples.push({ left: Math.round(rect.left), top: Math.round(rect.top), src: img.currentSrc.slice(-46) });
        }
      } else {
        out.eagerInView++;
      }
    }
    return JSON.stringify(out);
  })()`;

  const { result } = await cdp(ws, 'Runtime.evaluate', { expression, returnByValue: true }, sessionId);
  const data = JSON.parse(result.value);

  console.log(`URL     : ${url}`);
  console.log(`Khung nhìn: ${width}×${height}`);
  console.log(`Tổng ảnh có kích thước: ${data.total}`);
  console.log(`  nằm trong khung nhìn, tải ngay (eager): ${data.eagerInView}`);
  console.log(`  nằm trong khung nhìn, tải trễ (lazy)  : ${data.lazyInView}  ← gây cảnh báo\n`);

  for (const s of data.samples) {
    console.log(`    left=${s.left}px top=${s.top}px  ${s.src}`);
  }
} finally {
  ws?.close();
  // Xoá luôn thư mục hồ sơ, nếu không mỗi lần chạy lại lại chất thêm
  // hơn 16 MB vào ổ đĩa.
  await cleanup(child, profileDir);
}
