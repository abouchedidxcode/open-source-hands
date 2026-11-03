import { defineConfig } from 'vitest/config';

// Only this folder's tests: templates/game has its own dependencies and is tested from inside it.
// tests/template.test.js is plain JS so the typecheck needs no Node types.
export default defineConfig({ test: { include: ['tests/**/*.test.{ts,js}'] } });
