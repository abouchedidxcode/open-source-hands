/**
 * ?bot=1: a synthetic player. It steers a synthetic hand through the real gesture engine (see Input.bot), so
 * captures and tests show the game actually being played. It drifts to the most promising mote, pinches when it is
 * in reach, lets go, and on the results screen pinches again to restart.
 */
import { CATCH_R, type World } from './rules';

export class Bot {
  x = 0.5; y = 0.65; pinch = 0;
  private hold = 0;
  private resultsT = 0;

  update(w: World, dt: number, aspect: number): { x: number; y: number; pinch: number } {
    if (this.hold > 0) {
      this.hold -= dt;
      this.pinch = this.hold > 0.12 ? 1 : 0;
      return this.out();
    }
    if (w.phase === 'results') {
      this.resultsT += dt;
      if (this.resultsT > 3) { this.resultsT = 0; this.hold = 0.3; }
      return this.out();
    }
    this.resultsT = 0;
    if (w.phase !== 'play') return this.out();
    // prefer gold, then whatever is closest; leave motes in the grass (so captures show some in the air) and near the top
    const score = (m: World['motes'][number]) => Math.hypot((m.x - this.x) * aspect, m.y - this.y) - (m.kind === 'gold' ? 0.3 : 0);
    const target = w.motes.filter((m) => m.y > 0.12 && m.y < 0.72).sort((a, b) => score(a) - score(b))[0];
    if (!target) return this.out();
    const dx = (target.x - this.x) * aspect, dy = target.y - this.y, d = Math.hypot(dx, dy);
    // hands are not instant: about 0.9 screen heights per second, which leaves some motes uncaught
    const s = Math.min(d, 0.9 * dt);
    if (d > 1e-4) { this.x += (dx / d) * s / aspect; this.y += (dy / d) * s; }
    if (d < CATCH_R * 0.6 + target.r) this.hold = 0.3;
    return this.out();
  }

  private out() { return { x: this.x, y: this.y, pinch: this.pinch }; }
}
