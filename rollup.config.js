import typescript from '@rollup/plugin-typescript';
import ts from 'typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve';
import css from 'rollup-plugin-css-asset';
import url from "rollup-plugin-url";
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'lib/index.ts',
  output: {
    dir: 'build',
    format: 'es'
  },
  plugins: [
    typescript({
      typescript: ts,
      tslib: 'node_modules/tslib/tslib.esnext.js',
      cacheDir: '.rollup.tscache',
      tsconfig: "./tsconfig.json"
    }),
    nodeResolve({

    }),
    css(),
    url({
      include: ['**/*.woff', '**/*.woff2'],
    }),
    commonjs()
  ]
};