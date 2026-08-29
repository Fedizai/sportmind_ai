// Uploads the exerciseDB demo GIFs to Firebase Storage, in all four sizes the
// dataset ships (180/360/720/1080), and writes a JSON manifest mapping each
// exercise id to its four download URLs. Run once (re-running is safe: it
// just re-uploads and refreshes the URLs).
//
// Usage: node scripts/upload-exercise-gifs.mjs
// Needs FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in
// .env.local, and must run on Node 20 — firebase-admin breaks on Node 26 in
// this environment (see project notes).

import 'dotenv/config';
import { config as loadEnvLocal } from 'dotenv';
loadEnvLocal({ path: '.env.local' });

import admin from 'firebase-admin';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATASET_DIR = path.join(ROOT, '..', 'datasets', 'exercisedb_v1_sample');
const MANIFEST_PATH = path.join(__dirname, 'exercise-media-manifest.json');

// The dataset's four resolutions, and the field each fills in the manifest.
// All four are used in the app: `thumb` in the exercise list, `detail` as the
// default demo image, `hq` for high-DPI screens, `xl` behind an explicit
// zoom action so nobody downloads a megabyte GIF just to browse the list.
const SIZES = [
  { dir: 'gifs_180x180', field: 'thumb' },
  { dir: 'gifs_360x360', field: 'detail' },
  { dir: 'gifs_720x720', field: 'hq' },
  { dir: 'gifs_1080x1080', field: 'xl' },
];

for (const { dir } of SIZES) {
  if (!existsSync(path.join(DATASET_DIR, dir))) {
    console.error(`Missing dataset folder: ${dir}`);
    console.error('Expected the exercisedb_v1_sample dataset next to the studio/ folder.');
    process.exit(1);
  }
}

const exercises = JSON.parse(readFileSync(path.join(DATASET_DIR, 'exercises.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();
const manifest = {};
let uploaded = 0;

console.log(`Uploading ${exercises.length} exercises × ${SIZES.length} sizes to gs://${bucket.name}/exerciseMedia/ ...\n`);

for (const ex of exercises) {
  manifest[ex.exerciseId] = { name: ex.name };

  for (const { dir, field } of SIZES) {
    const localFile = path.join(DATASET_DIR, dir, ex.gifUrl);
    if (!existsSync(localFile)) {
      console.warn(`  skip ${ex.exerciseId}/${field}: ${ex.gifUrl} not found in ${dir}`);
      continue;
    }

    // One path segment per size, so the four variants of one exercise don't
    // collide: exerciseMedia/{size}/{exerciseId}.gif.
    const sizeTag = dir.replace('gifs_', '');
    const destPath = `exerciseMedia/${sizeTag}/${ex.exerciseId}.gif`;
    const token = randomUUID();

    await bucket.upload(localFile, {
      destination: destPath,
      metadata: {
        contentType: 'image/gif',
        // The Firebase-style download URL below is authorised by this token,
        // not by the storage.rules read check — that lets the app use one
        // stable public URL per file instead of a signed URL refreshed on
        // every request. The rule still blocks client writes.
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    manifest[ex.exerciseId][field] =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
    uploaded++;
  }
  console.log(`  ✓ ${ex.exerciseId}  (${ex.name})`);
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\n${uploaded} file(s) uploaded across ${exercises.length} exercises. Manifest written to ${MANIFEST_PATH}`);
process.exit(0);
