/**
 * Khởi động toàn bộ website bằng một lệnh, không cần gói phụ thuộc nào.
 *
 * `npm start` trước đây gọi `concurrently` và `cross-env` — cả hai đều nằm ở
 * devDependencies, nên khi cài bản production bằng `npm ci --omit=dev` thì lệnh
 * này hỏng. Script này tự chạy cả hai tiến trình bằng API có sẵn của Node.
 *
 * Chạy: node scripts/start.mjs
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// NODE_ENV=production: cần cho Next, và cũng để serve.mjs phục vụ Brotli.
// Chạy `npm run dev` thì không dùng script này.
const env = { ...process.env, NODE_ENV: 'production' };

const processes = [
  { name: 'proxy', color: 36, args: [join(root, 'server', 'src', 'index.js')] },
  { name: 'web', color: 35, args: [join(root, 'scripts', 'serve.mjs')] },
];

const children = [];
let shuttingDown = false;

for (const item of processes) {
  const child = spawn(process.execPath, item.args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);

  const label = `\u001b[${item.color}m${item.name.padEnd(5)}\u001b[0m`;
  const pipe = (stream) => {
    stream.setEncoding('utf8');
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) console.log(`${label} ${line}`);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`${label} đã dừng (${signal ?? `mã ${code}`})`);
    stop(code ?? 1);
  });
}

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 300);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\nĐang tắt...');
    stop(0);
  });
}
