import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '5060', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  dataDir: getDataDir(),
  frontendDistDir: getFrontendDistDir(),
};

export function getDataDir() {
  if (process.env.VERCEL) {
    const tmp = '/tmp/elite-sales-data';
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    return tmp;
  }
  const projectRoot = path.join(__dirname, '../..');
  const fromEnv = process.env.DATA_DIR;
  const target = fromEnv ? path.resolve(projectRoot, fromEnv) : path.join(projectRoot, 'data');
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  return target;
}

export function getFrontendDistDir() {
  if (process.env.FRONTEND_DIST) return path.resolve(process.env.FRONTEND_DIST);
  const rootDist = path.join(__dirname, '../../dist');
  if (fs.existsSync(rootDist)) return rootDist;
  return path.join(__dirname, '../../frontend/dist');
}
