// Uploads the 30 exerciseDB demo GIFs to Firebase Storage and writes a JSON
// manifest mapping each exercise id to its public download URL. Run once
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
const DATASET_DIR = path.join(ROOT, '..', 'datasets', 'exercisedb_v1_sample');
const GIF_DIR = path.join(DATASET_DIR, 'gifs_360x360');
const MANIFEST_PATH = path.join(__dirname, 'exercise-media-manifest.json');

if (!existsSync(GIF_DIR)) {
  console.error(`GIF directory not found: ${GIF_DIR}`);
  console.error('Expected the exercisedb_v1_sample dataset next to the studio/ folder.');
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

console.log(`Uploading ${exercises.length} exercise GIFs to gs://${bucket.name}/exerciseMedia/ ...\n`);

for (const ex of exercises) {
  const localFile = path.join(GIF_DIR, ex.gifUrl);
  if (!existsSync(localFile)) {
    console.warn(`  skip ${ex.exerciseId}: ${ex.gifUrl} not found in ${GIF_DIR}`);
    continue;
  }

  const destPath = `exerciseMedia/${ex.exerciseId}.gif`;
  const token = randomUUID();

  await bucket.upload(localFile, {
    destination: destPath,
    metadata: {
      contentType: 'image/gif',
      // The Firebase-style download URL below is signed by this token, not by
      // the storage.rules read check — that lets the app use one stable public
      // URL per file without generating a fresh signed URL on every request.
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
  manifest[ex.exerciseId] = url;
  console.log(`  ✓ ${ex.exerciseId}  (${ex.name})`);
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\n${Object.keys(manifest).length} file(s) uploaded. Manifest written to ${MANIFEST_PATH}`);
process.exit(0);
