// The starter game carries its own copy of the kit (so `degit templates/game` is self-contained). It must match.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('templates/game', () => {
  it('has an exact copy of src/kit', () => {
    const a = 'src/kit', b = 'templates/game/src/hand-gesture-kit';
    expect(readdirSync(b).sort()).toEqual(readdirSync(a).sort());
    for (const f of readdirSync(a)) expect(readFileSync(join(b, f), 'utf8'), f).toBe(readFileSync(join(a, f), 'utf8'));
  });
});
