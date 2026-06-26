import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/hooks/use-user';
import { Public_Sans, Archivo } from 'next/font/google';
import { cn } from '@/lib/utils';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

// Engineered, broadcast-grade grotesque used for display headlines on marketing
// surfaces. Scoped via the `font-display` Tailwind family so app UI keeps Public Sans.
const archivo = Archivo({
  subsets: ['latin'],
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
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn("antialiased font-sans", publicSans.variable, archivo.variable)}>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
