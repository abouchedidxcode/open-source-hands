// Real MediaPipe check without a webcam: plays each .y4m clip (or still photo turned into one) as
// Chromium's fake camera on the built demo page and prints the poses the kit recognises.
// Make a clip from a photo:  ffmpeg -loop 1 -i hand.jpg -t 5 -vf "scale=1280:-2" -pix_fmt yuv420p hand.y4m
// Usage: npm run build && node scripts/camera-check.mjs dir-with-y4m-files [screenshotDir]
// (set CHROMIUM_PATH to use a specific Chromium binary)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [dir, shots] = process.argv.slice(2);
if (!dir) { console.error('usage: node scripts/camera-check.mjs dir-with-y4m-files [screenshotDir]'); process.exit(1); }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4318);
const URL = `http://localhost:${PORT}/index.html`;
const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
process.on('exit', () => server.kill());
for (let i = 0; ; i++) {
  try { if ((await fetch(URL)).ok) break; } catch { /* starting */ }
  if (i > 100) { console.error('preview server did not start (did you run `npm run build`?)'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 100));
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.y4m'))) {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${path.resolve(dir, f)}`],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.goto(URL);
  await page.click('#b-cam');
  let r = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    r = await page.evaluate(() => ({
      delegate: window.__demo.hands.tracker.delegate,
      settled: window.__demo.hands.frame.hands.some((h) => h.pose),
      poses: window.__demo.hands.frame.hands.map((h) => `${h.handedness} ${h.pose ?? '-'} ${(h.confidence * 100).toFixed(0)}%`),
      error: document.getElementById('err').textContent,
    }));
    if (r.settled || r.error) { await page.waitForTimeout(1000); break; }
  }
  console.log(f.padEnd(24), JSON.stringify(r));
  if (shots) await page.screenshot({ path: path.join(shots, f.replace('.y4m', '.png')) });
  await browser.close();
}
process.exit(0);
