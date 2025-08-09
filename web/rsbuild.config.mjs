import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      pluginReact(),
      pluginSvgr(),
      pluginLess(),
      pluginNodePolyfill({
        globals: {
          Buffer: true,
          process: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': './src',
      },
    },
    html: {
      title: 'AgentX',
      favicon: './public/logo.ico',
      meta: {
        'cache-control': {
          'http-equiv': 'cache-control',
          content: 'no-cache, must-revalidate',
        },
      },
    },
    server: {
      compress: false,
      port: 3600,
      proxy: {
        '/api/': {
          target: env.parsed.AGENT_API_HOST,
          changeOrigin: true,
        },
        '/popai': {
          target: env.parsed.AGENT_API_HOST,
          changeOrigin: true,
        },
      },
      output: {
        minify: true,
        publicPath: '/',
      },
    },
  };
});
