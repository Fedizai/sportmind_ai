import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/hooks/use-user';
import { Public_Sans, Big_Shoulders_Display } from 'next/font/google';
import { CookieBanner } from '@/components/cookie-banner';
import { HtmlLang } from '@/components/html-lang';
import { SkipToContent } from '@/components/skip-to-content';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

// Condensed industrial signage face (Chicago wayfinding lineage) — taut and
// engineered, for campaign headlines only. Scoped via the `font-display`
// Tailwind family so all app UI keeps Public Sans.
const bigShoulders = Big_Shoulders_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
})

/**
 * Site-wide metadata.
 *
 * `metadataBase` is what makes every relative Open Graph and canonical URL
 * resolve to an absolute one — without it Next emits relative OG images, which
 * no social platform will fetch, and the preview silently falls back to nothing.
 *
 * The title template means a page only has to name itself: "Privacy Policy"
 * becomes "Privacy Policy · SportMind AI", and the home page keeps its own
 * full title through `default`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SportMind AI — Train. Evolve.',
    template: '%s · SportMind AI',
  },
  description: SITE_DESCRIPTION.en,
  applicationName: SITE_NAME,
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'SportMind AI — Train. Evolve.',
    description: SITE_DESCRIPTION.en,
    url: '/',
    locale: 'fr_FR',
    alternateLocale: ['en_GB'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SportMind AI — Train. Evolve.',
    description: SITE_DESCRIPTION.en,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  icons: {
    // 1024x1024 at 1.2 MB was being served as a 180px touch icon.
    apple: '/apple-touch-icon.png',
    icon: '/favicon.ico',
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(220 26% 96%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(220 20% 7%)' },
  ],
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* lang starts French because that is what the app serves by default;
       <HtmlLang /> corrects it the moment the reader's choice is known. */
    <html lang="fr" suppressHydrationWarning>
      <head />
      <body className={cn("antialiased font-sans", publicSans.variable, bigShoulders.variable)}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <HtmlLang />
            <SkipToContent />
            <CookieBanner />
            {children}
            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
