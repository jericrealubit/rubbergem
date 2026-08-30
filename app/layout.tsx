import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Anton,
  Bebas_Neue,
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import {
  DEFAULT_LIGHT_THEME,
  THEME_COLORS,
  buildThemeInitScript,
} from "@/components/theme/theme-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Per-theme heading fonts (components/ui/card.tsx's CardTitle is the app-wide
// `font-heading` consumer) — editorial-minimal gets a serif, cobalt-brutalist
// and retro-future get condensed display faces; the other three themes keep
// the default Geist sans (see --font-heading-raw per [data-theme] block in
// app/globals.css).
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const themeInitScript = buildThemeInitScript();

export const metadata: Metadata = {
  title: "Production System",
  description: "Shift Execution & Defect Matrix Log",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rubber",
  },
  other: {
    // Next 16's `appleWebApp.capable` only emits the unprefixed
    // "mobile-web-app-capable" tag; older iPadOS only honors this one.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Static baseline for the prerendered HTML — the inline script below
  // rewrites this to match the resolved theme before first paint.
  themeColor: THEME_COLORS[DEFAULT_LIGHT_THEME],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${anton.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Blocking, pre-hydration: sets data-theme on <html> and the
            theme-color meta tag before first paint so there is no flash of
            the wrong theme. See components/theme/theme-config.ts. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
