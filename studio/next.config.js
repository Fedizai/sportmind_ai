/**
 * This app is server-rendered: 20+ modules use `'use server'` (Genkit AI flows,
 * Firestore admin writes, nutrition/sport actions). Firebase Hosting is
 * configured with `frameworksBackend`, so SSR is the deployment target.
 *
 * Do NOT re-add `output: "export"` — static export cannot run Server Actions
 * and the build fails with "Server Actions are not supported with static export".
 */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // The food database is read from disk at runtime, so it must be traced into
  // the server bundle — Next cannot infer a plain fs.readFileSync path.
  //
  // This key only became top-level in Next 15. On 14.x it must sit under
  // `experimental`, and Next warns "Unrecognized key(s)" and ignores it
  // otherwise — which silently left data/food-db.json out of the deployed
  // bundle, so every food search fell through to the remote providers.
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./data/**'],
    },
  },
};

module.exports = nextConfig;
