# Making a hand game: the playbook

For coding agents (and people) building a webcam hand game with this kit. It is what we learned making 17 of them,
which you can play at [meticulai.com/games/show-of-hands](https://meticulai.com/games/show-of-hands/). Read it
once before you start, then come back to the checklists.

## 1. Start from the starter

```bash
npx degit abouchedidxcode/open-source-hands/templates/game my-game
cd my-game && npm install && npm run dev
```

[`templates/game`](../templates/game) is a small but complete game. It already does the parts every hand game needs
and every builder gets wrong the first time:
- a camera prompt that starts from a click, with a mouse and touch fallback
- one input path for camera, pointer and bot
- a `?bot=1` player
- `window.__game` hooks
- unit tests, plus screenshot, frame-rate and loudness tools

Replace the rules, the scene and the sound. Keep the rest unless you have a reason.

## 2. Pick the mechanic

One clear mechanic, done extremely well, beats five half-done ones. The games that worked best were one gesture in a
beautiful place: catch fireflies with a slow closing hand, flick to skip stones, tilt a maze with your palm, hold up
1 to 5 fingers as numbers fall.

Good hand mechanics:
- **Map a continuous value to something physical.** Palm position as a cursor, palm roll as a dial or a tilt, hand
  height as a throttle, openness as a grip. These feel magical and are reliable.
- **Use one or two discrete gestures, distinct from each other.** Pinch, fist, open palm, point and a two-hand clap
  are the most reliable. Give each action one gesture.
- **Motion gestures need room.** Swipes, throws and flicks work, but tune them for a seated person at a laptop: small
  movements, an arm's length from the camera.

Avoid these:
- poses that need the back of the hand toward the camera (MediaPipe's left/right label flips)
- fine finger distinctions under time pressure (three versus four fingers while moving fast)
- holding an arm up for minutes, since people tire in about 90 seconds
- anything that needs the hand near the edge of the camera frame

## 3. Be charitable with gestures

Tracking is noisy and hands differ. The player should feel the game understood them. When the game is unsure, it
should say the player is right.

- Use low thresholds and hysteresis (the starter presses at pinch 0.6 and releases at 0.35).
- Where speed matters, read the raw per-frame `scores` and `pinch`, not only the debounced `pose`.
- Use generous hit areas. The starter's catch radius is 0.075 screen heights *plus* the target's size.
- Keep lock-in times short. A held pose should count within about 100 to 200 ms.
- Map a comfortable part of the camera image to the whole screen (`toScreen` with a `Region`), so players never
  reach the frame edge.
- Show what the game sees: a small mirrored camera preview with the tracked hand drawn on it (`drawHand`), and a
  cursor or ring that reacts to the gesture as it forms.
- For a game that is meant to be hard, make it strict on purpose and say so in the how-to.

## 4. The camera flow

- `startCamera()` must be called from a click, on https or localhost.
- Say in one line that the video never leaves the device.
- If the camera is denied or missing, say so plainly and offer the mouse or touch version of the same game.
- Every game must be playable without a camera, with mouse, touch and keyboard. That makes it playable on phones,
  and it lets you test by hand.
- Show the gesture, not just text: a small animated line drawing of the hand doing it.

## 5. Quality bar

What separated the good games from the forgettable ones:
- **The first 5 seconds:** you can tell what to do, and something beautiful is already moving.
- **Feedback for every gesture:** sound, a visual response and a little hit feel. Use camera shake sparingly.
- **A results screen with a number worth beating,** and a restart that takes one gesture or one key.
- **A short session:** 45 seconds to 4 minutes.
- **Looks:** warm, real, cinematic light at a special time of day.
  - Glow comes from painted halos and tone, not bloom. Heavy bloom was our most repeated complaint. If you use
    bloom, keep it faint.
  - No emoji in the UI; use line icons (Lucide is fine).
  - Use real type (`@fontsource/*` packages, no CDN fonts).
- **Writing:** short, human, specific. Read every line of text on screen and cut the ones that sound generated.
- **Sound:** procedural Web Audio is enough. Notes that answer what the player does (chimes in the current chord)
  make a calm game feel alive.

## 6. Verify with your own eyes

You almost certainly don't have a webcam in the loop. The kit was designed for that.

1. **`?bot=1`:** write a bot that plays your game by steering synthetic hands through the real engine
   (`hands.inject([syntheticHand(...)])`). It should play like a decent human, including some misses.
2. **Unit tests:** cover the rules, and add a test that each gesture your game asks for is recognised from
   `syntheticHand` landmarks, for both left and right hands.
3. **Screenshots:** `npm run capture` (Playwright in GPU headless Chrome). Then *look at every image*. A passing
   assertion does not mean the frame looks right. Check the phone size too (`npm run capture -- mobile`).
4. **Critique passes:** do at least three. Judge the screenshots as a harsh reviewer:
   - Is it clear what to do?
   - Does every frame look good?
   - Is any text wrong or generated-sounding?
   - Does the results screen make you want another go?

   List the ten worst problems and fix them from the top. Before/after screenshots keep you honest.
5. **Frame rate:** `npm run fps`. Aim for 60 fps (p95 under 16.8 ms) at device pixel ratio 2, with headroom.
   MediaPipe runs on the same GPU while a real player plays.
6. **Loudness:** `npm run loud`. Aim for p90 between -27 and -31 dBFS and peaks under -8, so your game sits at the
   same level as others. Use a gentle master compressor for peaks rather than turning everything down.
7. **Then a real hand:** ten minutes with a real webcam will retune your thresholds. If you can't do it, write in
   the handover that it was not done.

Headless Chrome flags that render on the GPU: `--use-gl=angle --use-angle=metal --ignore-gpu-blocklist` on macOS,
plus `--autoplay-policy=no-user-gesture-required --mute-audio`. For a real MediaPipe test without a person, Chrome's
fake webcam can play a clip: see "Testing without a webcam" in [AGENTS.md](../AGENTS.md).

## 7. Bugs that cost us time

- **A 0x0 window:** a hidden tab or browser pane can report a 0x0 window, which gives NaNs and kills rendering. Skip
  frames when the window is under 2 px, and re-run your resize when the size changes. A hidden pane also pauses
  `requestAnimationFrame`, so a game can look stuck there; test in Playwright instead.
- **three.js shadows:** a light with `castShadow` and `shadow.autoUpdate = false` has no shadow map until it first
  renders. three binds a placeholder, and every shadow-receiving surface silently fails to draw (the console shows
  `GL_INVALID_OPERATION ... sampler type`). Set `light.shadow.needsUpdate = true` once at setup. Make your capture
  script count `GL_INVALID` lines and require zero (the starter's does).
- **EffectComposer:** its default render target is easy to make 4x MSAA by accident, which costs far more than the
  passes. This was the most common frame-rate bug. Profile before you optimise.
- **Shader hitches:** changing the number of lights (toggling `visible` on a spotlight) recompiles every lit
  material and causes a 100 ms+ hitch. Keep lights on at intensity 0. Precompile during the title with
  `renderer.compile(scene, camera)`.
- **Overdraw:** many large transparent sprites (fog, glows) eat the frame at DPR 2. Cap their count and size, or
  render them at half resolution.
- **Audio needs a gesture.** Create or resume the `AudioContext` from the same click that starts the game.
- **Mirroring:** the engine's landmarks are already mirrored to selfie space. Show the `<video>` with
  `transform: scaleX(-1)` and don't mirror the landmarks again. Use `hand.handedness`, not MediaPipe's raw label.
- **Don't add smoothing on top of the engine's.** The extra lag makes it feel slow.
- **Paths with spaces:** never URL-encode a folder path in a Node script. One builder created a stray
  `3%20-%20...` folder twice that way.
- **Pin `@mediapipe/tasks-vision` to an exact version.** The JS and the copied wasm must match.

## 8. Embedding several games in one page

If you host games in iframes, for example in a hub:
- Give the iframe `allow="camera; autoplay"`.
- Have the hub pass a flag (we used `?hall=1`) that skips the game's title and camera prompt.
- Keep the top-right corner clear for a "hold here to go back" gesture.
- Share one camera stream if you can, because each game opening its own camera is slow.

MediaPipe's wasm and model are about 20 MB. Serve one copy at the hub's root and point every game's `assetBase` at
it, rather than shipping a copy per game.

## 9. Docs to leave behind

Write them early and keep them current. The next person (or agent) has none of your conversation.
- **README.md:** what it is in two lines, the gestures with their fallback controls, the commands, URL flags and
  hooks, a file map, how the gesture detection works and which constants tune it.
- **HANDOVER.md:**
  - a status block at the top
  - what was verified and how
  - what was **not** verified, said plainly
  - next steps in priority order, and the tuning knobs
  - design decisions, including things you tried and rejected
  - gotchas you hit
  - a dated progress log
- **CREDITS.md:** every dependency, font and borrowed technique, with its licence.
