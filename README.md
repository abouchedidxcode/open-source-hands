# open-source-hands

Make webcam hand games for the browser, or point your coding agent here and have it make one for you.

This is the technology behind [Show of Hands](https://meticulai.com/games/show-of-hands/), a hall of 15 small games
played with your hands:
- catch fireflies at dusk
- skip stones across a lake
- tilt a maze with your palm
- duel with finger guns
- hold up 1 to 5 fingers as numbers fall

Also [GODHAND](https://meticulai.com/games/godhand/) and [Starbreaker](https://meticulai.com/games/starbreaker/).
Everything runs in the browser, and video never leaves the device.

What is in the repo:
- **`src/kit/`: hand-gesture-kit,** about 1,600 lines of dependency-free TypeScript on top of Google's
  [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker), which finds 21
  points on each hand. The kit turns those points into stable, game-ready input:
  - **20 poses:** fist, point, peace sign, thumbs up, rock on, pinch…
  - **16 motions:** swipes, circles, push and pull, wave, twist, pinch taps, throw
  - **5 two-hand gestures:** clap, zoom, steering
  - **continuous values:** pinch strength, palm position, roll, openness, velocity
  - **built in:** One Euro smoothing, hysteresis, so gestures don't flicker, and **synthetic hands** to test
    without a webcam
- **[`templates/game/`](templates/game): a complete starter game** in three.js. It has a camera prompt with a mouse
  and touch fallback, a bot that plays through the real gesture engine, tests, and screenshot, frame-rate and
  loudness tools. Copy it and replace the game.
- **[`docs/MAKING-A-GAME.md`](docs/MAKING-A-GAME.md): the playbook** from building 17 hand games: picking gestures
  that work, verifying without a webcam, the quality bar, and the bugs that cost us time.
- **[Gesture Lab](https://abouchedidxcode.github.io/open-source-hands/lab.html):** try every gesture live, run a
  reliability test and tune thresholds. There is also a [demo](https://abouchedidxcode.github.io/open-source-hands/)
  and a tiny [example game](https://abouchedidxcode.github.io/open-source-hands/pop.html).

## Using a coding agent?

Point it here. The repo is written to be read by agents. [AGENTS.md](AGENTS.md) is the entry point. For example:

> Make me a browser game where I conduct an orchestra with my hands. Use
> https://github.com/abouchedidxcode/open-source-hands: start from templates/game and follow AGENTS.md and
> docs/MAKING-A-GAME.md.

Claude Code users can also install the skill in [`skills/hand-gestures`](skills/hand-gestures/SKILL.md).

## Make a game

```bash
npx degit abouchedidxcode/open-source-hands/templates/game my-game
cd my-game
npm install
npm run dev        # the camera needs https or localhost
```

Then read [the starter's README](templates/game/README.md) and the [playbook](docs/MAKING-A-GAME.md).

## Run this repo (kit, demo, lab)

```bash
npm install
npm run dev        # open the printed URL. The camera needs https or localhost
npm test           # engine unit tests (no browser needed)
npm run build && npm run e2e   # demo, lab and example game driven by synthetic hands in headless Chromium
node scripts/camera-check.mjs clips/   # real MediaPipe on .y4m clips played as a fake webcam
```

## Add the kit to an existing project

The kit is about 1,600 lines of dependency-free TypeScript in `src/kit`. Copy that folder into your
project, the way shadcn/ui components are copied:

```bash
npx degit abouchedidxcode/open-source-hands/src/kit src/hand-gesture-kit
npm install @mediapipe/tasks-vision@1.1.0
mkdir -p public/models public/wasm
curl -L -o public/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
cp node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
```

```ts
import { createHands, toScreen } from './hand-gesture-kit';

const hands = createHands({
  onFrame(frame) {
    for (const hand of frame.hands) {
      const p = toScreen(hand.features.center);     // palm centre on screen, 0..1
      moveCursor(hand.id, p.x * innerWidth, p.y * innerHeight);
    }
  },
});

hands.engine.on('fist', (e) => (e.phase === 'start' ? grab(e.hand) : release(e.hand)));
hands.engine.on('swipe-left', () => previousPage());
hands.engine.on('clap', () => jump());

startButton.onclick = () => hands.startCamera();   // browsers need a click before the camera
```

## Gestures

| Poses (held) | Motions (one hand) | Two hands |
| --- | --- | --- |
| ✋ `open` · ✊ `fist` · 🦅 `claw` · ☝️ `point` · 🖕 `middle` · ✌️ `victory` · 3️⃣ `three` · 4️⃣ `four` · 👍 `thumbs-up` · 👎 `thumbs-down` · 🤘 `rock` · 🤙 `shaka` · 👉 `gun` · 🤏 `pinch` · 👌 `ok` · 🫰 `pinch-middle` | `swipe-left/right/up/down` · `push` · `pull` · `circle-cw/ccw` · `wave` · `shake` · `twist-cw/ccw` · `tap` (pinch tap) · `double-tap` · `throw` (fist flung open) · `hold` (any pose kept still) | `clap` · `zoom-in` · `zoom-out` · `steer-left` · `steer-right` |

Experimental (off with `config: { pose: { experimental: false } }`): 🤚 `back`, 🔪 `chop`,
🫸 `two`, 🖖 `spock`.

Poses are data, and motions are small functions, so you can add your own with
`engine.registerPose()` and `engine.registerMotion()`.

## How it works

```
webcam ─▶ MediaPipe Hand Landmarker ─▶ 21 points per hand ─▶ One Euro smoothing
       ─▶ features: finger curl from joint angles, pinch gaps, palm facing, roll, size
       ─▶ poses: every pose scored each frame, debounced with enter/exit thresholds
       ─▶ motions: detectors over the last 1.6 s of each hand's movement
       ─▶ two hands: clap, zoom, steer from the distance and angle between palms
       ─▶ events (engine.on) + continuous values (pinch, velocity, zoom) for your game
```

- **Camera:** front camera at 1280×720. Detection runs once per new video frame, on the GPU, with an
  automatic fallback to the CPU.
- **Coordinates:** everything is in mirrored "selfie" space (0..1, y down), and `handedness` is the
  user's real hand.
- **Tuning:** the [Gesture Lab](lab.html) shows every gesture live, runs a reliability test (detection
  rate, reaction time, confusions) and has sliders for every threshold. Export the JSON and pass it
  as `createHands({ config })`.

## Credits and license

MIT, see [LICENSE](LICENSE). Hand tracking is Google's MediaPipe (Apache-2.0). The model file in
`public/models` is Google's official release, unmodified. Details are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
