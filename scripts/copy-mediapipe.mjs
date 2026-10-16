// Copies MediaPipe's wasm runtime from node_modules into public/wasm so it is served next to the
// pages (the model, public/models/hand_landmarker.task, is committed). Runs before dev and build.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dst = join(root, 'public/wasm');
if (!existsSync(src)) {
  console.error('Missing node_modules/@mediapipe/tasks-vision/wasm. Run `npm install` first.');
  process.exit(1);
}
mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src)) cpSync(join(src, f), join(dst, f));
console.log(`MediaPipe wasm copied to public/wasm (${readdirSync(dst).length} files)`);
