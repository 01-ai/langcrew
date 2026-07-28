import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test Environment
    environment: 'jsdom',
    // Test File Matching Mode
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // Test Coverage Configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.d.ts', 'src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.spec.{js,jsx,ts,tsx}'],
    },
    // Global testing settings
    globals: true,
    // Test timeout
    testTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
