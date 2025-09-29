import { defineConfig } from '@rslib/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginLess } from '@rsbuild/plugin-less';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';

export default defineConfig({
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
  source: {
    tsconfigPath: './tsconfig.rslib.json',
    entry: {
      index: './src/AgentX.tsx',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: ['es2023'],
      bundle: true,
      dts: {
        bundle: true,
      },
      autoExternal: {
        dependencies: true,
        optionalDependencies: true,
        peerDependencies: true,
        devDependencies: true,
      },
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
