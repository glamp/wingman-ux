import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/types.ts'
      ],
      // No thresholds for shared package (types only)
      thresholds: undefined,
      all: true,
      clean: true
    }
  }
});