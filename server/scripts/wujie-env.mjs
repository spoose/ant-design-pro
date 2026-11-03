import 'dotenv/config';

process.env.PORT = '3000';
process.env.CORS_ORIGINS = [
  ...new Set([
    ...(process.env.CORS_ORIGINS?.split(',').filter(Boolean) ?? []),
    'http://zh-mac.local:8001',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
  ]),
].join(',');
