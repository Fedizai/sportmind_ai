#!/usr/bin/env node
/**
 * Compile the shipping engine for the Node harnesses.
 *
 *   node scripts/body-fit/build-engine.mjs
 *
 * The app's own tsconfig emits ES modules for the bundler, which Node cannot
 * load from a script directory — bare `./abdomen` specifiers, JSON imports
 * without attributes. CommonJS is emitted here instead, so every harness runs
 * the same source the app ships without a second copy of the fitter existing.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const studio = fileURLToPath(new URL('../..', import.meta.url));
execFileSync('npx', [
  'tsc', '-p', 'tsconfig.json',
  '--outDir', '.photo-validation',
  '--noEmit', 'false', '--incremental', 'false', '--declaration', 'false',
  '--module', 'commonjs', '--moduleResolution', 'node',
], { cwd: studio, stdio: 'inherit' });
console.log('engine compiled to .photo-validation');
