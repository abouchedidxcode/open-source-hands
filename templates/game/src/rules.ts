/**
 * The game's rules, with no DOM, no three.js and no camera, so they can be unit-tested and driven by the bot.
 * Everything is in screen space: x 0..1 left to right, y 0..1 top to bottom. Distances are measured in screen
 * heights (x offsets are multiplied by the aspect), so a catch feels the same on a wide or a tall screen.
 *
 * Starter game ("Motes"): glowing motes drift up through a dusk meadow. Move your hand under one and pinch to
 * catch it. Gold motes are rarer and worth more. One round lasts ROUND_S seconds.
 */

export type Phase = 'title' | 'play' | 'results';
export type Kind = 'mote' | 'gold';

export interface Mote { id: number; kind: Kind; x: number; y: number; vx: number; vy: number; r: number; age: number; seed: number }

export interface World {
  phase: Phase;
  /** Seconds into the current round. */
  time: number;
  roundS: number;
  score: number;
  caught: number;
  /** Catches in a row, each within COMBO_S of the last. Drives the chime's pitch. */
  combo: number;
  lastCatchT: number;
  motes: Mote[];
  nextId: number;
  spawnIn: number;
  rand: () => number;
}

/** Round length. Short rounds keep "one more go" cheap. */
export const ROUND_S = 45;
/** How close the palm must be to a mote's edge to catch it, in screen heights. Generous on purpose: tracking
 * jitters by about 0.01 to 0.02 and people pinch slightly off target. */
export const CATCH_R = 0.075;
export const COMBO_S = 1.8;
export const POINTS: Record<Kind, number> = { mote: 1, gold: 5 };
/** Seconds between spawns at the start and at the end of a round (it speeds up a little). */
const SPAWN_EVERY: [number, number] = [0.75, 0.42];
const GOLD_CHANCE = 0.1;

/** Small deterministic PRNG, so `?seed=` reproduces a round exactly in tests and captures. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed = Date.now(), roundS = ROUND_S): World {
  return { phase: 'title', time: 0, roundS, score: 0, caught: 0, combo: 0, lastCatchT: -99, motes: [], nextId: 1, spawnIn: 0, rand: mulberry32(seed) };
}

export function startRound(w: World) {
  w.phase = 'play';
  w.time = 0; w.score = 0; w.caught = 0; w.combo = 0; w.lastCatchT = -99;
  w.motes = []; w.spawnIn = 0;
  // a few motes already in the air, so the first second is not empty
  for (let i = 0; i < 5; i++) spawn(w, 0.35 + w.rand() * 0.5);
}

function spawn(w: World, y = 1.08) {
  const gold = w.rand() < GOLD_CHANCE;
  w.motes.push({
    id: w.nextId++, kind: gold ? 'gold' : 'mote',
    x: 0.08 + w.rand() * 0.84, y,
    vx: (w.rand() - 0.5) * 0.03,
    // gold motes rise faster, so catching one takes a little intent
    vy: -(gold ? 0.11 : 0.06) - w.rand() * 0.04,
    r: gold ? 0.028 : 0.018 + w.rand() * 0.01,
    age: 0, seed: w.rand() * 1000,
  });
}

/** Advances the world by dt seconds. Motes drift and sway even on the title and results screens (it is pretty). */
export function step(w: World, dt: number) {
  if (w.phase === 'play') {
    w.time += dt;
    if (w.time >= w.roundS) { w.phase = 'results'; w.time = w.roundS; }
  }
  const k = Math.min(1, w.time / w.roundS);
  w.spawnIn -= dt;
  if (w.spawnIn <= 0) {
    spawn(w);
    w.spawnIn = (SPAWN_EVERY[0] + (SPAWN_EVERY[1] - SPAWN_EVERY[0]) * (w.phase === 'play' ? k : 0)) * (0.7 + w.rand() * 0.6);
  }
  for (const m of w.motes) {
    m.age += dt;
    m.x += (m.vx + Math.sin(m.age * 1.3 + m.seed) * 0.025) * dt;
    m.y += m.vy * dt;
  }
  w.motes = w.motes.filter((m) => m.y > -0.08 && m.x > -0.1 && m.x < 1.1);
}

/** A pinch at (x, y): catches the nearest mote in reach. Returns it, or null. Only counts during play. */
export function tryCatch(w: World, x: number, y: number, aspect: number): Mote | null {
  if (w.phase !== 'play') return null;
  let best: Mote | null = null, bestD = Infinity;
  for (const m of w.motes) {
    const d = Math.hypot((m.x - x) * aspect, m.y - y) - m.r;
    if (d < CATCH_R && d < bestD) { best = m; bestD = d; }
  }
  if (!best) return null;
  w.motes = w.motes.filter((m) => m !== best);
  w.combo = w.time - w.lastCatchT < COMBO_S ? w.combo + 1 : 1;
  w.lastCatchT = w.time;
  w.score += POINTS[best.kind];
  w.caught++;
  return best;
}
