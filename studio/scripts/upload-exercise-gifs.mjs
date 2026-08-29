// Uploads the full exercise-library GIF set to Firebase Storage and writes a
// JSON manifest mapping each exercise id to its download URL. Run once
// (re-running is safe: it just re-uploads and refreshes the URLs).
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
const DATASET_DIR = path.join(ROOT, '..', 'datasets', 'exercise-library-main');
const GIF_DIR = path.join(DATASET_DIR, 'gifs');
const MANIFEST_PATH = path.join(__dirname, 'exercise-media-manifest.json');

if (!existsSync(GIF_DIR)) {
  console.error(`GIF directory not found: ${GIF_DIR}`);
  process.exit(1);
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
let done = 0;
let skipped = 0;

// 1112 sequential uploads would take many minutes; a bounded pool keeps the
// wall time reasonable without opening a thousand sockets at once.
const CONCURRENCY = 8;

async function uploadOne(ex) {
  const localFile = path.join(GIF_DIR, ex.gif);
  if (!existsSync(localFile)) {
    skipped++;
    return;
  }

  const destPath = `exerciseMedia/${ex.id}.gif`;
  const token = randomUUID();

  await bucket.upload(localFile, {
    destination: destPath,
    metadata: {
      contentType: 'image/gif',
      // The Firebase-style download URL below is authorised by this token, not
      // by the storage.rules read check — that lets the app use one stable
      // public URL per file instead of a signed URL refreshed on every
      // request. The rule still blocks all client writes.
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  manifest[ex.id] =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;

  done++;
  if (done % 100 === 0) console.log(`  ${done}/${exercises.length} ...`);
}

console.log(`Uploading ${exercises.length} exercise GIFs to gs://${bucket.name}/exerciseMedia/ ...\n`);

const queue = [...exercises];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const ex = queue.shift();
      if (ex) await uploadOne(ex);
    }
  })
);

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\n${done} uploaded, ${skipped} skipped. Manifest written to ${MANIFEST_PATH}`);
process.exit(0);
