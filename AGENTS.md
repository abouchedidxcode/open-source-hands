# AGENTS.md: open-source-hands

Instructions for coding agents using this repo to build webcam hand-controlled games and apps, or changing the kit
itself. Read this before writing code.

## Building a game? Start here

1. Copy the starter, a complete small three.js hand game, and run it:
   ```bash
   npx degit abouchedidxcode/open-source-hands/templates/game my-game
   cd my-game && npm install && npm run dev
   ```
   Its [README](templates/game/README.md) maps every file.
2. Read [docs/MAKING-A-GAME.md](docs/MAKING-A-GAME.md): which gestures work, how to be charitable with noisy
   tracking, the quality bar, how to verify without a webcam, and the bugs that cost us time.
3. Replace the starter's rules (`src/rules.ts`), scene (`src/scene.ts`) and sound (`src/audio.ts`) with the user's
   idea. Keep the input layer, the bot pattern, the test hooks and the tools.
4. Use the rest of this page (API, event names, pitfalls) as reference while you wire gestures.
5. Before you say it works:
   - `npm test` and `npm run build` pass
   - the bot plays a round in `npm run capture`, and you have looked at the screenshots
   - `npm run fps` shows 60 fps at DPR 2
   - say plainly that no real webcam was tested, if none was

Adding hand input to an existing app instead? See "Adding the kit to another project" below.

## What is here

| Path | What |
| --- | --- |
| `src/kit/` | **The kit.** Dependency-free TypeScript. Its only runtime dependency is `@mediapipe/tasks-vision` (lazy-loaded by the tracker). Public API: `src/kit/index.ts`. |
| `src/kit/hands.ts` | `createHands()`: camera + MediaPipe + engine in one call; `inject`/`feed` for synthetic hands; `toScreen`/`fromScreen`. |
| `src/kit/tracker.ts` | `HandTracker`: getUserMedia, MediaPipe HandLandmarker (VIDEO mode, GPU → CPU fallback), one detection per new video frame. |
| `src/kit/engine.ts` | `GestureEngine`: poses, motions, two-hand gestures, events, config. |
| `src/kit/poses.ts`, `motions.ts`, `features.ts` | Pose definitions (data), motion detectors, per-hand features (finger curl from joint angles, etc). |
| `src/kit/synthetic.ts` | `syntheticHand()` / `SYNTHETIC_POSES`: fake hands in any pose, for tests and demos. |
| `src/kit/draw.ts` | `drawHand()`: skeleton on a 2D canvas. |
| `src/demo/` + `index.html` | Smallest complete app (skeleton, live pose, event log). **Copy this pattern first.** |
| `src/pop/` + `pop.html` | Example game (Balloon Pop): events → game actions, held poses, mouse fallback, test hooks. |
| `src/lab/` + `lab.html` | Gesture Lab: live scores, reliability tests, threshold tuning, config export. |
| `public/models/hand_landmarker.task` | Google's model (committed). `public/wasm/` is copied from node_modules by `npm run assets` (runs before dev and build). |
| `tests/` | Vitest unit tests (engine + kit). `scripts/e2e.mjs`: Playwright run of the built site with synthetic hands. |
| `templates/game/` | **Starter game** (three.js, Vite, TypeScript) with its own copy of the kit, tests and tools. Copy it with degit; it is self-contained. |
| `docs/MAKING-A-GAME.md` | The game-making playbook. |

## Commands

```bash
npm install
npm run dev          # Vite dev server. The camera only works on https or localhost
npm test             # unit tests, Node only, ~1 s
npm run typecheck
npm run build        # copies wasm, typechecks, builds dist/ (relative paths: works on GitHub Pages)
npm run e2e          # after build. Set CHROMIUM_PATH=/path/to/chrome if Playwright's browser isn't installed
```

Run `npm test` and `npm run build && npm run e2e` before you say a change works. Both run without a
webcam.

## Adding the kit to another project

1. Copy `src/kit/` into the project (e.g. `src/hand-gesture-kit/`). Keep it unmodified if you can,
   and configure it instead of editing it.
2. `npm install @mediapipe/tasks-vision@1.1.0`. Pin the exact version: the JS and the wasm must match.
3. Serve the assets next to your pages:
   - `public/models/hand_landmarker.task`: copy it from this repo, or download Google's
     `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
   - `public/wasm/*`: copy it from `node_modules/@mediapipe/tasks-vision/wasm/`. Add the copy step to
     your build, as `scripts/copy-mediapipe.mjs` does.
   - If the assets live somewhere else, pass `createHands({ assetBase: '/static/mediapipe/' })`. The
     folder must contain `wasm/` and `models/`.
4. Wire it up:

```ts
import { createHands, toScreen } from './hand-gesture-kit';

const hands = createHands({
  config: { pose: { experimental: false } },   // recommended for games
  onFrame(frame) { /* runs for every gesture frame: read continuous values here */ },
});
hands.engine.on('fist', (e) => (e.phase === 'start' ? grab(e.hand!) : release(e.hand!)));
button.onclick = () => hands.startCamera().catch(showCameraError);
```

## API cheatsheet

- `createHands(opts)` → `{ engine, tracker, video, frame, source, startCamera(), inject(hands|null), feed(clip, dtMs), stop() }`
  - `opts`: `video?`, `config?` (partial `EngineConfig`, e.g. JSON exported from the Gesture Lab), `onFrame?`, `assetBase?`, `numHands?`, `camera?`.
- `engine.on(name, fn)` → returns an unsubscribe function. `name` is an event name (below), a kind
  (`'pose' | 'motion' | 'two-hand'`) or `'*'`. Event: `{ kind, name, phase?: 'start'|'end', hand?: id, t, data? }`.
- `frame.hands[i]`: `id` (stable while the hand is visible), `handedness` (the user's real hand),
  `pose` (stable id or null), `confidence`, `scores` (every pose), `heldMs`, `pinch` (0..1),
  `velocity` (screen units/s), `landmarks` (21 points), `features` (`curl[5]`, `center`, `size`,
  `roll`, `pointDir`, `facing`, `openness`, …).
- `frame.twoHand`: `present`, `distance`, `angle`, `zoom` (ratio since the two-hand grip began).
- `toScreen(p)`: camera-space point → screen 0..1 through `DEFAULT_REGION` (the middle ~75% of the
  camera image fills the screen, so users can reach the edges). `fromScreen` is the inverse.
- Landmark indices: `LANDMARK.WRIST`, `THUMB_TIP` (4), `INDEX_TIP` (8), `MIDDLE_TIP` (12), …
- `engine.registerPose({ id, name, emoji, hint, fingers: [thumb, index, middle, ring, pinky] })`.
  Each finger rule is one of `'ext' | 'curl' | 'half' | 'notcurl' | 'notext' | 'any'`.
- `engine.registerMotion({ id, names, detect: ({ h, now, cfg, mem }) => hit | null })`. `h` is the
  hand's history (positions, size, roll, pose, pinch).

### Event names

- **Poses** (`phase` start/end): `open fist claw point middle victory three four thumbs-up thumbs-down rock shaka gun pinch ok pinch-middle`. Experimental: `back chop two spock`.
- **Motions:** `swipe-left swipe-right swipe-up swipe-down push pull circle-cw circle-ccw wave shake twist-cw twist-ccw tap double-tap throw hold`.
- **Two hands:** `clap zoom-in zoom-out steer-left steer-right`.

## Pitfalls (each of these bit us)

- **The camera needs a user click and a secure context.** Call `startCamera()` from a click
  handler, serve on https or localhost, and handle the rejection (the user denied it, or there is no
  camera). Always offer a mouse or keyboard fallback.
- **Mirroring:** engine output is already mirrored to selfie space. Show the `<video>` with
  `transform: scaleX(-1)`. Don't mirror the landmarks again. Don't use MediaPipe's raw handedness
  label (it is flipped for raw camera frames); use `hand.handedness`.
- **Use `toScreen` for cursors.** Raw camera coordinates make the screen edges unreachable, because
  the hand leaves the image first.
- **Use events for one-shot actions, `frame` for continuous ones.** For example, fire on
  `engine.on('tap')`, but aim with `hand.features.pointDir` or a landmark every frame. Inside a
  listener, `hands.frame` is already the frame that produced the event.
- **A `tap` fires when the fingers part.** If you need where the pinch happened, record it while
  `hand.pinch > 0.75` (see `src/pop/main.ts`).
- **Gestures can overlap.** A swipe made with an open hand is still an open hand. While a pose is
  held, `hold` fires. A fast fist-then-open is a `throw`, not a swipe. Pick a vocabulary where each
  action has one clear gesture, and turn off experimental poses for games.
- **Don't stack a second smoothing filter on top.** The engine already smooths (One Euro). Extra
  lag makes it feel slow.
- **Timestamps must keep increasing.** `createHands` handles this. If you call `engine.update`
  yourself, pass `performance.now()`-based times.
- **Performance:** detection runs once per new camera frame (often 30 fps), on the GPU when
  available. Rendering can run faster. Hand data updates when new camera frames arrive, so draw
  from `hands.frame` every render frame and don't assume a new detection each time.
- **Back-of-hand poses are unreliable.** MediaPipe's left/right label is easily fooled when the
  back of the hand faces the camera. Prefer palm-facing gestures.

## Testing without a webcam

```ts
import { syntheticHand, SYNTHETIC_POSES as P } from './hand-gesture-kit';
hands.inject([syntheticHand(0.5, 0.5, P.fist)]);                // held until hands.inject(null)
const frames = hands.feed([                                      // scripted clip, runs instantly
  ...Array(8).fill([syntheticHand(0.5, 0.5, P.open)]),
  ...Array(4).fill([syntheticHand(0.5, 0.5, P.pinch)]),
  ...Array(8).fill([syntheticHand(0.5, 0.5, P.open)]),
]);
frames.flatMap((f) => f.events).some((e) => e.name === 'tap');  // true
```

- Unit-test gesture logic with `new GestureEngine()` and `engine.update(hands, t)` at 30 fps. See
  `tests/engine.test.ts` for clips of every motion and two-hand gesture.
- End-to-end, expose test hooks on `window` (as `src/pop/main.ts` does with `window.__pop`). Then
  drive them from Playwright with `page.evaluate`, as `scripts/e2e.mjs` does.
- To test real MediaPipe, use `node scripts/camera-check.mjs <dir>` (after `npm run build`). It
  plays every `.y4m` clip in the folder as Chromium's fake webcam on the demo and prints the poses
  recognised. Make a clip from a photo with
  `ffmpeg -loop 1 -i hand.jpg -t 5 -vf "scale=1280:-2" -pix_fmt yuv420p hand.y4m`. The same Chromium
  flags (`--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
  --use-file-for-fake-video-capture=hand.y4m`) work for your own app.

## Changing the kit itself

- `templates/game/src/hand-gesture-kit/` must stay identical to `src/kit/` (`npm test` checks it). After
  changing the kit, copy it there: `rm -rf templates/game/src/hand-gesture-kit && cp -R src/kit templates/game/src/hand-gesture-kit`.
  Then run the starter's tests and build too (`cd templates/game && npm install && npm test && npm run build`).

- Keep `src/kit` free of app code and of dependencies other than `@mediapipe/tasks-vision`.
- New poses and motions need a test in `tests/engine.test.ts` (synthetic hands for both left and
  right hands). Re-run the jitter and no-false-positive tests.
- Thresholds belong in `EngineConfig`, not as inline constants, so the Gesture Lab can tune them.
