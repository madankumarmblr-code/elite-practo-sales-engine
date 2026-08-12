import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'frontend', 'dist');
const pub = path.join(root, 'public');

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('[prepare-vercel] frontend/dist missing. Run npm run build first.');
  process.exit(1);
}

rmSync(pub, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
cpSync(dist, pub, { recursive: true });
console.log('[prepare-vercel] copied frontend/dist → public/');
