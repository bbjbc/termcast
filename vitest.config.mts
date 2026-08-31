import { defineConfig } from 'vitest/config';

/**
 * The gate covers the logic: the pure library, the SVG route and the locale
 * redirect. Those are where every bug so far has actually lived, and none of
 * them need a DOM, so the suite runs in plain node.
 *
 * The React tree is deliberately outside it. Covering JSX would mean asserting
 * markup shape, which breaks on every layout change without catching anything,
 * and the browser check catches what matters there instead.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },   // so tests import through @/ like the app does
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/t/**/*.ts', 'src/middleware.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
