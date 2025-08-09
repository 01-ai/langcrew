import { defineConfig } from '@rslib/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

export default defineConfig({
  plugins: [pluginReact(), pluginSvgr(), pluginLess()],
  source: {
    entry: {
      index: './src/AgentX.tsx',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: ['es2021'],
      bundle: true,
      output: {
        distPath: {
          root: './agentx',
        },
      },
    },
  ],
  output: {
    target: 'web',
  },
});
