import { describe, expect, it } from 'vitest';
import { computeFeatures, fromScreen, GestureEngine, syntheticHand, SYNTHETIC_POSES, toScreen, type HandPose } from '../src/kit';

describe('synthetic hands', () => {
  it('put the palm centre where you asked', () => {
    for (const [x, y] of [[0.3, 0.4], [0.7, 0.6]]) {
      const c = computeFeatures(syntheticHand(x, y, SYNTHETIC_POSES.open)).center;
      expect(c.x).toBeCloseTo(x, 5);
      expect(c.y).toBeCloseTo(y, 5);
    }
  });

  it('are recognised by the engine as the pose they are named after', () => {
    for (const [id, pose] of Object.entries(SYNTHETIC_POSES)) {
      if (id === 'relaxed') continue;
      for (const handedness of ['Left', 'Right'] as const) {
        const engine = new GestureEngine();
        let frame = engine.update([], 0);
        for (let t = 0; t <= 500; t += 33) frame = engine.update([syntheticHand(0.5, 0.5, pose as HandPose, { handedness })], t);
        expect(frame.hands[0].pose, `${id} (${handedness})`).toBe(id);
      }
    }
  });
});

describe('screen mapping', () => {
  it('toScreen and fromScreen are inverses inside the region', () => {
    for (const p of [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.75 }]) {
      const q = toScreen(fromScreen(p));
      expect(q.x).toBeCloseTo(p.x, 6);
      expect(q.y).toBeCloseTo(p.y, 6);
    }
  });
  it('toScreen clamps to the screen', () => {
    expect(toScreen({ x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
  });
});
