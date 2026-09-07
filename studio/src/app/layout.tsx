import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/hooks/use-user';
import { Public_Sans, Big_Shoulders_Display } from 'next/font/google';
import { HtmlLang } from '@/components/html-lang';
import { SkipToContent } from '@/components/skip-to-content';
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

export const metadata: Metadata = {
  title: 'SportMind AI',
  description: 'AI-Powered Sports Coaching and Player Development',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SportMind AI',
  },
  other: {
    "apple-touch-icon": "/logo_v2.png"
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
            {children}
            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
