/**
 * Wiring: input → rules → scene and sound, plus the title / results screens, the camera preview and the test hooks.
 *
 * URL flags:
 *   ?bot=1        a synthetic player plays through the real gesture engine (implies autostart)
 *   ?autostart=1  skip the title
 *   ?mute=1       no sound
 *   ?seed=N       reproducible round
 *   ?round=S      round length in seconds (short rounds for tests)
 *   ?speed=K      run the game K times faster (captures of a whole round)
 */
import '@fontsource/fraunces/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import './style.css';
import { drawHand } from './hand-gesture-kit';
import { Input } from './input';
import { PinchLatch } from './pinch';
import { createWorld, startRound, step, tryCatch, ROUND_S } from './rules';
import { Scene } from './scene';
import { Sound } from './audio';
import { Bot } from './bot';

const q = new URLSearchParams(location.search);
const flag = (k: string) => q.get(k) === '1';
const BEST_KEY = 'my-hand-game.best';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const world = createWorld(Number(q.get('seed')) || Date.now(), Number(q.get('round')) || ROUND_S);
const scene = new Scene($('stage'));
const input = new Input($<HTMLVideoElement>('cam'), document.body);
const sound = new Sound();
const latch = new PinchLatch();
const bot = flag('bot') ? new Bot() : null;
const speed = Number(q.get('speed')) || 1;
sound.muted = flag('mute');

let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* storage blocked: fine */ }
let resultsAt = 0;

// ------------------------------------------------------------------ screens
function show(id: 'title' | 'results' | null) {
  for (const s of ['title', 'results']) $(s).classList.toggle('hidden', s !== id);
  $('hud').classList.toggle('hidden', id !== null);
}

function begin() {
  sound.start();
  startRound(world);
  latch.reset();
  show(null);
}

function finish() {
  sound.end();
  const isBest = world.score > best;
  if (isBest) { best = world.score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ } }
  $('r-score').textContent = String(world.score);
  const caught = `${world.caught} mote${world.caught === 1 ? '' : 's'} caught.`;
  $('r-line').textContent = isBest && world.score > 0 ? `${caught} A new best.` : `${caught} Best so far: ${best}.`;
  resultsAt = performance.now();
  show('results');
}

$('b-cam').addEventListener('click', async () => {
  sound.start();
  $('err').textContent = '';
  $('b-cam').textContent = 'Starting the camera…';
  try {
    await input.startCamera();
    $('preview').classList.remove('hidden');
    begin();
  } catch {
    $('b-cam').textContent = 'Use my camera';
    $('err').textContent = 'The camera is unavailable or was blocked. You can still play with the mouse or touch.';
  }
});
$('b-mouse').addEventListener('click', () => { input.setMode('pointer'); begin(); });
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && world.phase !== 'play') { if (input.mode === 'none') input.setMode('pointer'); begin(); }
  if (e.key === 'm') sound.setMuted(!sound.muted);
});
addEventListener('resize', () => scene.resize());

if (bot) input.setMode('bot');
if (bot || flag('autostart')) { if (input.mode === 'none') input.setMode('pointer'); begin(); }
else show('title');

// ------------------------------------------------------------------ camera preview (mirrored, with the tracked hand)
const pv = $<HTMLCanvasElement>('preview'), pg = pv.getContext('2d')!;
function drawPreview() {
  if (input.mode !== 'camera') return;
  const v = input.hands.video, w = pv.width, h = pv.height;
  pg.save(); pg.scale(-1, 1); pg.drawImage(v, -w, 0, w, h); pg.restore();
  if (input.hand) drawHand(pg, input.hand.landmarks, w, h, { color: '#ffe9cf', lineWidth: 2, jointRadius: 2 });
}

// ------------------------------------------------------------------ loop
let last = performance.now(), t = 0, fps = 60;
function frame(now: number) {
  requestAnimationFrame(frame);
  const real = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (real > 0) fps += (1 / real - fps) * 0.05;
  const dt = real * speed;
  t += dt;

  if (bot) input.bot = bot.update(world, dt, scene.aspect);
  input.update(real);
  const h = input.hand;
  const edge = latch.update(h ? h.pinch : 0);
  if (edge === 'press' && h) {
    if (world.phase === 'play') {
      const m = tryCatch(world, h.screen.x, h.screen.y, scene.aspect);
      if (m) { scene.burst(m); sound.chime(world.combo, m.kind === 'gold'); }
    } else if (world.phase === 'results' && now - resultsAt > 1500) {
      // the short delay stops the pinch that ended the round from starting the next one
      begin();
    }
  }

  const before = world.phase;
  step(world, dt);
  if (before === 'play' && world.phase === 'results') finish();

  $('score').textContent = String(world.score);
  $('time').textContent = String(Math.ceil(world.roundS - world.time));
  scene.render(world, h ? { x: h.screen.x, y: h.screen.y, pinch: h.pinch } : null, real, t);
  drawPreview();
}
requestAnimationFrame(frame);

// ------------------------------------------------------------------ test hooks (Playwright reads these)
Object.defineProperty(window, '__game', {
  get: () => ({
    phase: world.phase, score: world.score, caught: world.caught, time: world.time, motes: world.motes.length,
    mode: input.mode, hand: input.hand ? { ...input.hand.screen, pinch: input.hand.pinch } : null,
    fps: Math.round(fps), dpr: scene.renderer.getPixelRatio(), best,
  }),
});
