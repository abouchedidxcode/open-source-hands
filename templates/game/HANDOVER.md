# Handover

Keep this file current. Write it for a person, or a coding agent, who has never seen this project and none of your
conversation. They should be able to run, understand, change and verify the game from this file and the README
alone.

## Status

The starter as shipped: a playable 45-second round with camera, mouse and touch input, a bot, a title screen and a
results screen. Next step: replace the rules, scene and sound with your own game.

## What works, and how it was verified

- `npm test`: 7 tests (rules, and pinch recognition from synthetic hands for both hands).
- `npm run build` passes.
- `npm run capture` and `npm run capture -- mobile`: the bot catches motes and restarts with a pinch, with no console
  errors and no `GL_INVALID` lines. The screenshots were checked by eye.
- `npm run fps`: 60 fps, p95 16.7 ms at DPR 2 (GPU headless Chrome, M-series Mac).
- `npm run loud`: p90 -27.8 dBFS, peak -16 dBFS.

## Not verified

Say plainly what nobody has done yet. For the starter:
- A real webcam, by a person. Only synthetic hands drove it.
- Listening by ear.
- Real phones, Safari and Firefox.

## Known problems and next steps

1. (Your list, in priority order.)

## Tuning knobs

| Constant | File | What it does |
| --- | --- | --- |
| `PINCH_ON`, `PINCH_OFF` | `src/pinch.ts` | pinch press / release thresholds |
| `CATCH_R` | `src/rules.ts` | how close counts as a catch |
| `ROUND_S`, `SPAWN_EVERY`, `GOLD_CHANCE` | `src/rules.ts` | pacing |
| `REGION` | `src/input.ts` | the part of the camera image that maps onto the screen |
| master gain (0.6) | `src/audio.ts` | overall loudness |

## Design decisions and why

- Rules are pure functions in screen space, so they can be unit-tested and the bot can read them.
- Mouse, touch and bot hands are synthetic landmarks sent through the real engine, so there is one input path and the
  bot tests the code a player uses.
- No post-processing. The glow is a painted halo texture, which is cheap and stays tasteful.

## Gotchas hit while building

(Add yours. The repo's `docs/MAKING-A-GAME.md` lists the ones we already hit.)

## Progress log

- (date): started from the open-source-hands starter.
