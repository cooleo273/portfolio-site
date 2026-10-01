import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { site } from "@/content/site";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Fullstack Developer`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.domain,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  keywords: ["fullstack developer", "Next.js", "TypeScript", "FlutterFlow", "mobile apps", "web development", site.name],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.domain,
    title: `${site.name} | Fullstack Developer`,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | Fullstack Developer`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0D0A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* Runs before paint: flags JS, restores the saved accent, skips the preloader on repeat visits. */
const bootScript = `(function(){try{var d=document.documentElement;d.classList.add('js');var a=localStorage.getItem('leul-accent');if(a&&/^(lime|cyan|coral|purple)$/.test(a))d.setAttribute('data-accent',a);if(sessionStorage.getItem('leul-booted'))d.classList.add('booted');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-accent="lime"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh font-sans text-text">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
