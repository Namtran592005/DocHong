import 'dotenv/config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from './config.js';
import { MangaDexError } from './mangadex.js';
import { api, img } from './routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

// MangaDex dùng deep-object query: `translatedLanguage[]=vi`, `status[]=ongoing`.
// Parser mặc định của Express 5 giữ nguyên dấu ngoặc vuông trong tên tham số,
// khiến bộ lọc ngôn ngữ không hoạt động. Bắt buộc dùng parser "extended".
app.set('query parser', 'extended');

app.use(
  helmet({
    // Ảnh được proxy từ MangaDex@Home, cần cho phép ảnh nguồn
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
app.use(compression());

// MangaDex không trả CORS cho website bên ngoài — đây là nơi duy nhất
// trình duyệt được phép gọi tới.
app.use(
  cors({
    origin: config.corsOrigin.split(',').map((value) => value.trim()),
    methods: ['GET'],
    maxAge: 86_400,
  }),
);

app.use('/api', api);
app.use('/img', img);

app.use('/api', (_req, res) => {
  res.status(404).json({
    error: true,
    code: 'not_found',
    message: 'Không tìm thấy endpoint này',
  });
});

app.use((error, _req, res, _next) => {
  const status = error instanceof MangaDexError ? error.status : 500;
  if (status >= 500) console.error('[máy chủ]', error);
  res.status(status).json({
    error: true,
    code: error.code || 'internal_error',
    message: status >= 500 ? 'Dịch vụ thư viện truyện đang tạm thời không hoạt động' : error.message,
  });
});

const server = app.listen(config.port, () => {
  console.log(`[máy chủ] Proxy MangaDex đang chạy tại http://localhost:${config.port}`);
  console.log(`[máy chủ] Nguồn dữ liệu: ${config.baseUrl}`);
  console.log(`[máy chủ] CORS cho phép: ${config.corsOrigin}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}