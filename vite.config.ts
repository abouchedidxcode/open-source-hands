import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths: the build works from any folder or GitHub Pages subpath
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        demo: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'lab.html'),
        pop: resolve(__dirname, 'pop.html'),
      },
    },
  },
});
