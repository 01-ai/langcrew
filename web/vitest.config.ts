import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom',
    // 测试文件匹配模式
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // 测试覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/*.spec.{js,jsx,ts,tsx}',
      ],
    },
    // 全局测试设置
    globals: true,
    // 测试超时时间
    testTimeout: 5000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});