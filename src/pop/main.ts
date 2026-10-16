/**
 * BALLOON POP: a complete little game on top of hand-gesture-kit, meant to be read and copied.
 *   pinch tap → pop the balloon at your fingertips      double tap → burst around you
 *   hold point → fingertip laser                        swipe left/right → gust of wind
 *   clap → pop everything (6 s cooldown)                thumbs up (or a click) → start
 * Mouse fallback: click to pop. Test hooks on window.__pop.
 */
import { createHands, drawHand, DEFAULT_REGION, LANDMARK, syntheticHand, SYNTHETIC_POSES, type GestureEvent, type HandResult } from '../kit';

const ROUND = 45;
const BEST_KEY = 'hand-gesture-kit.pop.best';
const COLORS = ['#ff5d73', '#ffb43b', '#7ad35b', '#4fb3ff', '#a77bff', '#ff7ad9'];
const HAND_COLORS = ['#1f2a44', '#7a2e8f'];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('game');
const ctx = canvas.getContext('2d')!;
let W = 0, H = 0, dpr = 1;
function resize() { dpr = devicePixelRatio || 1; W = innerWidth; H = innerHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
addEventListener('resize', resize);
resize();

interface Balloon { x: number; y: number; r: number; vx: number; vy: number; color: string; gold: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
let balloons: Balloon[] = [];
let sparks: Spark[] = [];
let phase: 'idle' | 'playing' | 'over' = 'idle';
let score = 0, timeLeft = ROUND, spawnIn = 0, wind = 0, clapCool = 0, flash = 0;
let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* storage blocked */ }
let mouse: { x: number; y: number } | null = null;

// camera space (0..1, mirrored) → screen pixels, through the default region so edges are reachable
const view = (p: { x: number; y: number }) => ({ x: ((p.x - DEFAULT_REGION.x0) / (DEFAULT_REGION.x1 - DEFAULT_REGION.x0)) * W, y: ((p.y - DEFAULT_REGION.y0) / (DEFAULT_REGION.y1 - DEFAULT_REGION.y0)) * H });
const pinchPoint = (h: HandResult) => { const a = view(h.landmarks[LANDMARK.THUMB_TIP]), b = view(h.landmarks[LANDMARK.INDEX_TIP]); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };

// every gesture frame (camera, injected or fed): remember where each hand's fingertips last met
const pinchedAt = new Map<number, { x: number; y: number }>();
const hands = createHands({
  video: $<HTMLVideoElement>('cam'),
  onFrame: (f) => { for (const h of f.hands) if (h.pinch > 0.75) pinchedAt.set(h.id, pinchPoint(h)); },
});
const hand = (id?: number) => hands.frame.hands.find((h) => h.id === id);

// ------------------------------------------------------------------ gestures → game
// a tap fires when the fingers part again, so pop where they last met
hands.engine.on('tap', (e) => { const p = pinchedAt.get(e.hand!); if (p) popAt(p, 34); });
hands.engine.on('double-tap', (e) => { const h = hand(e.hand); if (h) popAt(pinchPoint(h), 150); });
hands.engine.on('swipe-left', () => { wind = -1; });
hands.engine.on('swipe-right', () => { wind = 1; });
hands.engine.on('clap', () => {
  if (phase !== 'playing' || clapCool > 0) return;
  clapCool = 6; flash = 1;
  for (const b of [...balloons]) pop(b);
});
hands.engine.on('thumbs-up', (e: GestureEvent) => { if (e.phase === 'start' && phase !== 'playing') start(); });

// ------------------------------------------------------------------ game logic
function start() {
  phase = 'playing'; score = 0; timeLeft = ROUND; balloons = []; sparks = []; spawnIn = 0; clapCool = 0;
  $('overlay').classList.add('hidden');
}

function spawn(x = Math.random() * W, y = H + 60, still = false): Balloon {
  const s = Math.min(W, H) / 800;
  const gold = Math.random() < 0.06;
  const b = { x, y, r: (26 + Math.random() * 20) * Math.max(0.7, s), vx: 0, vy: still ? 0 : -(70 + Math.random() * 60 + (ROUND - timeLeft) * 2.5) * Math.max(0.7, s), color: gold ? '#ffd23f' : COLORS[(Math.random() * COLORS.length) | 0], gold };
  balloons.push(b);
  return b;
}

function pop(b: Balloon) {
  balloons = balloons.filter((x) => x !== b);
  if (phase === 'playing') score += b.gold ? 5 : 1;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
    sparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, color: b.color });
  }
}

function popAt(p: { x: number; y: number }, reach: number) {
  if (phase !== 'playing') return;
  for (const b of [...balloons]) if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + reach) pop(b);
}

function update(dt: number) {
  if (phase === 'playing') {
    timeLeft -= dt;
    if (timeLeft <= 0) end();
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = Math.max(0.22, 0.6 - (ROUND - timeLeft) * 0.008); }
    // a held point is a laser at the fingertip
    for (const h of hands.frame.hands) {
      if (h.pose !== 'point') continue;
      const tip = view(h.landmarks[LANDMARK.INDEX_TIP]);
      for (const b of [...balloons]) if (Math.hypot(b.x - tip.x, b.y - tip.y) < b.r + 6) pop(b);
    }
  }
  clapCool = Math.max(0, clapCool - dt);
  flash = Math.max(0, flash - dt * 2.5);
  wind *= Math.exp(-dt * 1.5);
  for (const b of balloons) {
    b.vx += (wind * 900 - b.vx) * Math.min(1, dt * 3);
    b.x += b.vx * dt + Math.sin(performance.now() / 600 + b.r) * 12 * dt;
    b.y += b.vy * dt;
  }
  balloons = balloons.filter((b) => b.y > -80 && b.x > -100 && b.x < W + 100);
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; s.life -= dt; }
  sparks = sparks.filter((s) => s.life > 0);
}

function end() {
  phase = 'over';
  if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ } }
  $('msg').textContent = `Time! You popped ${score}. Thumbs up 👍 or click to play again.`;
  $('overlay').classList.remove('hidden');
}

// ------------------------------------------------------------------ drawing
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e8f6ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  for (const b of balloons) {
    ctx.strokeStyle = 'rgba(31,42,68,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r * 1.15); ctx.quadraticCurveTo(b.x - 8, b.y + b.r * 1.8, b.x, b.y + b.r * 2.4); ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.86, b.r * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.18, b.r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life / 0.6); ctx.fillStyle = s.color; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); }
  ctx.globalAlpha = 1;
  for (const h of hands.frame.hands) {
    drawHand(ctx, h.landmarks, 1, 1, { color: HAND_COLORS[h.id % 2], lineWidth: 5, jointRadius: 5, map: view });
    if (h.pose === 'point') {
      const tip = view(h.landmarks[LANDMARK.INDEX_TIP]);
      ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2828'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (mouse) { ctx.strokeStyle = '#1f2a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2); ctx.stroke(); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.8})`; ctx.fillRect(0, 0, W, H); }
  $('score').textContent = `🎈 ${score}`;
  $('time').textContent = `⏱ ${Math.ceil(Math.max(0, timeLeft))}`;
  $('best').textContent = `best ${best}`;
}

let last = performance.now();
function loop(now: number) {
  requestAnimationFrame(loop);
  update(Math.min(0.05, (now - last) / 1000));
  last = now;
  draw();
}
requestAnimationFrame(loop);

// ------------------------------------------------------------------ start + mouse fallback
$('b-cam').onclick = async () => {
  try {
    await hands.startCamera();
    $('cam').setAttribute('data-on', '');
    $('msg').textContent = 'Give a thumbs up 👍 to start.';
    $('b-cam').hidden = true;
  } catch (e) {
    $('err').textContent = `Camera unavailable: ${(e as Error).message}. Use https or localhost and allow camera access.`;
  }
};
$('b-mouse').onclick = () => { mouse = { x: W / 2, y: H / 2 }; start(); };
canvas.addEventListener('pointermove', (e) => { if (mouse) mouse = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerdown', (e) => { if (mouse) popAt({ x: e.clientX, y: e.clientY }, 10); });
$('overlay').addEventListener('click', (e) => { if (phase === 'over' && !(e.target instanceof HTMLButtonElement)) start(); });

// ------------------------------------------------------------------ test hooks
declare global { interface Window { __pop: unknown } }
window.__pop = {
  hands, start, syntheticHand, POSES: SYNTHETIC_POSES,
  get state() { return { phase, score, timeLeft, balloons: balloons.length }; },
  /** A balloon that stays put at screen pixel (x, y). */
  spawnAt: (x: number, y: number) => spawn(x, y, true),
  /** Screen pixel of a hand's pinch point (thumb/index tip midpoint). */
  pinchPoint: (i = 0) => { const h = hands.frame.hands[i]; return h ? pinchPoint(h) : null; },
  size: () => ({ W, H }),
};
