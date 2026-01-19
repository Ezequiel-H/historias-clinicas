import { renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const preloadJs = join(__dirname, '../dist-electron/preload.js');
const preloadCjs = join(__dirname, '../dist-electron/preload.cjs');

if (existsSync(preloadJs)) {
  renameSync(preloadJs, preloadCjs);
  console.log('Renamed preload.js to preload.cjs');
} else {
  console.warn('preload.js not found, skipping rename');
}

