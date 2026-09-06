/**
 * Copy the MediaPipe WASM runtime out of node_modules and into public/.
 *
 * The runtime is served from our own origin so the scanner does not stop
 * working when a third-party CDN does. It is not committed — this runs at
 * build time from the installed package, which keeps 18 MB of binaries out of
 * git while still serving them ourselves.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const from = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const to = path.join(root, 'public/mediapipe/wasm');

if (!fs.existsSync(from)) {
    console.error('[stage-mediapipe] @mediapipe/tasks-vision is not installed; skipping.');
    process.exit(0);
}

fs.mkdirSync(to, { recursive: true });
let copied = 0;
for (const file of fs.readdirSync(from)) {
    const target = path.join(to, file);
    const source = path.join(from, file);
    // Only re-copy when the file actually changed, so a rebuild is cheap.
    if (fs.existsSync(target) && fs.statSync(target).size === fs.statSync(source).size) continue;
    fs.copyFileSync(source, target);
    copied++;
}
console.log(`[stage-mediapipe] ${copied} file(s) staged into public/mediapipe/wasm`);
