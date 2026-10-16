# Third-party notices

The code in this repository is MIT licensed (see [LICENSE](LICENSE)). It uses and redistributes the
following third-party work.

## MediaPipe (Google LLC), Apache License 2.0

- **`@mediapipe/tasks-vision`** (npm dependency, version 1.1.0): the HandLandmarker JavaScript API
  and its WebAssembly runtime. `npm run assets` copies the wasm files from `node_modules` into
  `public/wasm/`, and they are included in built sites.
- **`public/models/hand_landmarker.task`**: the MediaPipe Hand Landmarker model, redistributed
  unmodified. It is byte-identical to
  `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.
  See Google's [Hand Landmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
  and model card for its intended use and limitations.

Copyright Google LLC. Licensed under the Apache License, Version 2.0. A copy is in
[licenses/APACHE-2.0.txt](licenses/APACHE-2.0.txt) and at <https://www.apache.org/licenses/LICENSE-2.0>.
Source: <https://github.com/google-ai-edge/mediapipe>.

## Algorithms

- **One Euro filter** (`src/kit/oneEuro.ts`, an original implementation): Géry Casiez, Nicolas
  Roussel and Daniel Vogel, "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in
  Interactive Systems", CHI 2012. <https://gery.casiez.net/1euro/>
