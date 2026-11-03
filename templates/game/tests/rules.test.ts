import { describe, expect, it } from 'vitest';
import { CATCH_R, createWorld, startRound, step, tryCatch, type Mote } from '../src/rules';

const mote = (x: number, y: number, kind: Mote['kind'] = 'mote'): Mote => ({ id: 999, kind, x, y, vx: 0, vy: 0, r: 0.02, age: 1, seed: 0 });

describe('rules', () => {
  it('the same seed gives the same round', () => {
    const a = createWorld(42), b = createWorld(42);
    startRound(a); startRound(b);
    for (let i = 0; i < 300; i++) { step(a, 1 / 60); step(b, 1 / 60); }
    expect(a.motes.map((m) => [m.x, m.y])).toEqual(b.motes.map((m) => [m.x, m.y]));
  });

  it('a pinch inside the catch radius catches; outside misses', () => {
    const w = createWorld(1); startRound(w); w.motes = [mote(0.5, 0.5)];
    expect(tryCatch(w, 0.5 + (CATCH_R + 0.05) / 1.6, 0.5, 1.6)).toBeNull();
    expect(tryCatch(w, 0.5, 0.5 + CATCH_R * 0.9, 1.6)?.id).toBe(999);
    expect(w.score).toBe(1);
    expect(w.motes).toHaveLength(0);
  });

  it('gold is worth five and catches in quick succession build a combo', () => {
    const w = createWorld(1); startRound(w);
    w.motes = [mote(0.3, 0.5, 'gold')]; tryCatch(w, 0.3, 0.5, 1);
    w.time += 0.5; w.motes = [mote(0.6, 0.5)]; tryCatch(w, 0.6, 0.5, 1);
    expect(w.score).toBe(6);
    expect(w.combo).toBe(2);
  });

  it('nothing is caught outside play, and the round ends on time', () => {
    const w = createWorld(1, 2);
    w.motes = [mote(0.5, 0.5)];
    expect(tryCatch(w, 0.5, 0.5, 1)).toBeNull();
    startRound(w);
    for (let i = 0; i < 130; i++) step(w, 1 / 60);
    expect(w.phase).toBe('results');
  });
});
