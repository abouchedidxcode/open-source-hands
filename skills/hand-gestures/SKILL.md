---
name: hand-gestures
description: Build webcam hand games and hand-gesture controls for browser apps (poses like fist, point, peace sign, thumbs up; motions like swipes, circles, pinch taps; two-hand clap/zoom) with hand-gesture-kit on top of MediaPipe. Use when the user wants something controlled by their hands through a webcam, hand tracking in the browser, or gesture recognition in a web page.
---

# Hand gestures with hand-gesture-kit

Repo: https://github.com/abouchedidxcode/open-source-hands (MIT). Its `AGENTS.md` is the full guide.
Read it before you design anything:
https://raw.githubusercontent.com/abouchedidxcode/open-source-hands/main/AGENTS.md

## Making a game

Start from the starter game. It already has the camera flow, a mouse and touch fallback, a `?bot=1` player, tests,
and screenshot, fps and loudness tools:

```bash
npx degit abouchedidxcode/open-source-hands/templates/game my-game
cd my-game && npm install && npm run dev
```

Then follow the playbook:
https://raw.githubusercontent.com/abouchedidxcode/open-source-hands/main/docs/MAKING-A-GAME.md

## Adding hand gestures to an existing app

1. **Add the kit** (TypeScript source, no dependencies besides MediaPipe):
   ```bash
   npx degit abouchedidxcode/open-source-hands/src/kit src/hand-gesture-kit
   npm install @mediapipe/tasks-vision@1.1.0
   mkdir -p public/models public/wasm
   curl -L -o public/models/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
   cp node_modules/@mediapipe/tasks-vision/wasm/* public/wasm/
   ```
   Add the wasm copy to the build script so it survives reinstalls.
2. **Wire it up.** Start the camera from a click (browsers require one) and offer a mouse fallback:
   ```ts
   import { createHands, toScreen } from './hand-gesture-kit';
   const hands = createHands({ config: { pose: { experimental: false } }, onFrame: (f) => draw(f) });
   hands.engine.on('fist', (e) => (e.phase === 'start' ? grab(e.hand!) : release(e.hand!)));
   hands.engine.on('swipe-left', () => back());
   startButton.onclick = () => hands.startCamera().catch(showCameraError);
   ```
   Map positions with `toScreen(hand.features.center)` (0..1). Show the `<video>` mirrored with
   `transform: scaleX(-1)`. The landmarks are already mirrored.
3. **Pick the gestures** from the events: poses `open fist claw point middle victory three four
   thumbs-up thumbs-down rock shaka gun pinch ok pinch-middle` (phase start/end); motions
   `swipe-left/right/up/down push pull circle-cw/ccw wave shake twist-cw/ccw tap double-tap throw
   hold`; two hands `clap zoom-in zoom-out steer-left steer-right`. Give each action one distinct
   gesture.
4. **Verify without a webcam.** Use synthetic hands:
   `hands.inject([syntheticHand(0.5, 0.5, SYNTHETIC_POSES.fist)])` or `hands.feed(clip)`. Unit-test
   with `new GestureEngine()` and expose a `window.__app` hook to drive the app from Playwright.
   Don't claim it works until a scripted run shows the gestures firing the right actions.

## Pitfalls

- The camera needs https or localhost, and a click.
- Don't add extra smoothing. The engine already smooths.
- `tap` fires when the fingers part. Record where the pinch happened while `hand.pinch > 0.75`.
- Back-of-hand poses are unreliable. Prefer palm-facing gestures.
- Keep `@mediapipe/tasks-vision` pinned to 1.1.0 so the JS matches the copied wasm.
