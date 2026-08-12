import fs from 'fs';
import { createApp } from './app.js';
import { startSheetAutoSync } from './services/sheetSync.js';
import { reloadLocationsIndex } from './services/locations.js';
import { getFrontendDistDir } from './config.js';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp({ serveStatic: true, warmSheet: false });
const distDir = getFrontendDistDir();

app.listen(PORT, HOST, () => {
  console.log(`Practo Sales listening on http://${HOST}:${PORT}`);
  if (fs.existsSync(distDir)) {
    console.log(`Open http://${HOST}:${PORT} (API + UI)`);
  }
  startSheetAutoSync();
  setTimeout(() => {
    try {
      reloadLocationsIndex();
    } catch {
      /* ignore */
    }
  }, 5000);
});
