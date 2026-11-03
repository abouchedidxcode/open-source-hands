# Starter: a webcam hand game

A complete small game to copy and turn into your own. **Motes** is a short dusk scene: glowing motes drift up out
of the grass, you move your hand under one and pinch to catch it, and gold ones are worth five. A round lasts
45 seconds.

It is deliberately simple. What you are copying is everything around the mechanic:
- the camera flow, with a mouse and touch fallback
- the input layer, where every source becomes the same synthetic hand
- a bot that plays the game through the real gesture engine
- test hooks, unit tests and the screenshot, frame-rate and loudness tools

Swap the rules, the scene and the sound for your own idea and keep the rest.

```bash
npx degit abouchedidxcode/open-source-hands/templates/game my-game
cd my-game
npm install
npm run dev          # http://localhost:5173. The camera needs localhost or https
```

## How to play

| Action | Hand | Mouse / touch | Keyboard |
| --- | --- | --- | --- |
| Aim | move your open hand; the ring follows your palm | move the pointer | |
| Catch | pinch thumb and index under a mote | hold the button | |
| Start / play again | pinch on the results screen | click a button | Space |
| Mute | | | M |

## Commands

```bash
npm run dev          # dev server (copies MediaPipe's wasm and downloads the hand model on first run)
npm test             # vitest: rules and gesture recognition, no browser needed
npm run build        # type-check, then build to dist/ (relative paths: works in any folder or subpath)
npm run capture      # with the dev server running: screenshots in captures/ of a round played by the bot
npm run capture -- mobile
npm run fps          # frame rate at DPR 2 while the bot plays (target: 60, p95 under 16.8 ms)
npm run loud         # loudness while the bot plays (target: p90 -27 to -31 dBFS, peaks under -8)
```

Playwright needs a browser the first time: `npx playwright install chromium`.

## URL flags and test hooks

| Flag | Effect |
| --- | --- |
| `?bot=1` | a synthetic player plays, through the real gesture engine |
| `?autostart=1` | skip the title (mouse mode) |
| `?mute=1` | no sound |
| `?seed=N` | the same round every time |
| `?round=S` | round length in seconds (short rounds for tests) |
| `?speed=K` | run the game K times faster |

`window.__game` returns `{ phase, score, caught, time, motes, mode, hand, fps, dpr, best }`. The capture tool reads
it, and so can your own Playwright scripts.

## Files

| File | Owns |
| --- | --- |
| `src/main.ts` | Wiring: input → rules → scene and sound, title and results screens, camera preview, flags, `window.__game` |
| `src/rules.ts` | The game itself, with no DOM: motes, catching, scoring, the timer. Seeded and unit-tested |
| `src/input.ts` | Camera, mouse, touch and bot all become one hand (screen position + pinch strength) |
| `src/pinch.ts` | Pinch strength → clean press / release edges (hysteresis) |
| `src/bot.ts` | The synthetic player used by `?bot=1` |
| `src/scene.ts` | three.js: painted dusk backdrop, mote sprites, sparks, the palm ring. No post-processing |
| `src/audio.ts` | Procedural Web Audio: a soft pad and pentatonic chimes. No audio files |
| `src/style.css` | Title, HUD and results cards, the animated pinch drawing |
| `src/hand-gesture-kit/` | The kit, copied unmodified from the repo's `src/kit`. Configure it; don't edit it |
| `scripts/assets.mjs` | Copies MediaPipe's wasm into `public/wasm`, downloads the model into `public/models` |
| `tools/` | `capture.mjs`, `fps.mjs`, `loud.mjs` (Playwright, GPU headless Chrome) |
| `tests/` | `rules.test.ts`, `gestures.test.ts` (the pinch is recognised from synthetic hands, both hands) |

## How the gesture detection works, and how to tune it

The kit tracks the hand with MediaPipe and smooths it. It gives a pinch strength from 0 to 1 every frame
(`hand.pinch`). `src/pinch.ts` turns that into a press at `PINCH_ON` (0.6) and a release at `PINCH_OFF` (0.35).
Real pinches rarely read as 1, so keep `PINCH_ON` low.

A catch takes the nearest mote whose edge is within `CATCH_R` (0.075 screen heights) of the palm, in `src/rules.ts`.
It is generous on purpose. `REGION` in `src/input.ts` is the part of the camera image that maps onto the screen, so
players never have to reach the edge of the frame.

## Making it yours

Read [`docs/MAKING-A-GAME.md`](https://github.com/abouchedidxcode/open-source-hands/blob/main/docs/MAKING-A-GAME.md)
first. It covers how to choose gestures, how to verify, and the bugs that cost us time. Then:

1. Rename it: `package.json` name, `<title>`, `BEST_KEY` in `src/main.ts`.
2. Replace `src/rules.ts` with your game's rules, keeping them free of the DOM so you can test them.
3. Change what `Input` reports if your game needs more than one hand and a pinch. The kit gives every pose, motion
   and two-hand gesture (see the kit's `AGENTS.md`).
4. Teach `src/bot.ts` to play your game, so `npm run capture` shows it being played.
5. Replace the scene and the sound. Keep 60 fps at DPR 2.
6. Rewrite this README, keep `HANDOVER.md` current, and list what you add in `CREDITS.md`.
