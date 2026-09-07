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

  /**
   * Security headers.
   *
   * App Hosting already redirects http to https, but a redirect only helps
   * after the first insecure request has left the device. HSTS tells the
   * browser never to make that request again — a year, subdomains included,
   * which is the value the preload list requires if we ever submit it.
   *
   * The rest close the cheap holes: MIME sniffing, clickjacking, and the
   * referrer leaking a full URL to third parties. `frame-ancestors 'none'`
   * is the modern spelling of X-Frame-Options and is what actually stops the
   * app being embedded in someone else's page.
   */
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        {
          key: 'Permissions-Policy',
          // The app asks for the camera itself (body scan, video upload);
          // everything else is denied so an embedded third party cannot.
          value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
        },
      ],
    }];
  },
};

module.exports = nextConfig;
