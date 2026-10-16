# 👋 hand-gesture-kit

Webcam hand gestures for the browser. Show your hands to the camera and get stable, game-ready
events: **20 poses** (fist, point, peace sign, thumbs up, rock on, middle finger, pinch…), **16
motions** (swipes, circles, push/pull, wave, shake, twist, pinch taps, throw) and **5 two-hand
gestures** (clap, zoom, steering). It runs entirely in the browser. Video never leaves the
device.

It is built on Google's [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker),
which finds 21 points on each hand. This kit adds what a game needs on top of those points:
- smoothing
- pose scoring with hysteresis, so gestures don't flicker
- motion detection
- two-hand gestures
- a lab for testing and tuning gestures
- synthetic hands, so you can test without a webcam

**Live:** [demo](https://abouchedidxcode.github.io/hand-gesture-kit/) ·
[Gesture Lab](https://abouchedidxcode.github.io/hand-gesture-kit/lab.html) ·
[example game](https://abouchedidxcode.github.io/hand-gesture-kit/pop.html).
**Made with it:** [GODHAND](https://abouchedidxcode.github.io/hands/), a hand-controlled war
game, and [City Smash](https://abouchedidxcode.github.io/hands/sandbox.html?mode=city), where you
wreck a city with 17 gesture powers.

## Using a coding agent?

Point it here. The repo is written to be read by agents. [AGENTS.md](AGENTS.md) explains how to
wire the kit into a project, the common pitfalls, and how to test without a camera. For example:

> Build me a browser game where I fly a spaceship with my hands. Use
> https://github.com/abouchedidxcode/hand-gesture-kit and follow its AGENTS.md.

Claude Code users can also install the skill in [`skills/hand-gestures`](skills/hand-gestures/SKILL.md).

## Run it

```bash
npm install
npm run dev        # open the printed URL. The camera needs https or localhost
npm test           # engine unit tests (no browser needed)
npm run build && npm run e2e   # demo, lab and example game driven by synthetic hands in headless Chromium
node scripts/camera-check.mjs clips/   # real MediaPipe on .y4m clips played as a fake webcam
```

## Use it in your project

The kit is about 1,600 lines of dependency-free TypeScript in `src/kit`. Copy that folder into your
project, the way shadcn/ui components are copied:

```bash
npx degit abouchedidxcode/hand-gesture-kit/src/kit src/hand-gesture-kit
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
