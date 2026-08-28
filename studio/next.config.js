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
};

module.exports = nextConfig;
