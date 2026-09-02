import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dataDir: getDataDir(),
  frontendDistDir: getFrontendDistDir()
};

export function getDataDir() {
  const fromEnv = process.env.DATA_DIR;
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }
  if (process.env.VERCEL) {
    const tmp = '/tmp/app-data';
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    return tmp;
  }
  const fallback = path.join(__dirname, '../../data');
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

export function getFrontendDistDir() {
  if (process.env.FRONTEND_DIST) return path.resolve(process.env.FRONTEND_DIST);
  return path.join(__dirname, '../../frontend/dist');
}
