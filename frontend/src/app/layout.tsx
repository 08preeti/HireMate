import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
// Leaflet's own stylesheet (map tiles, controls, markers). It is a third-party
// library stylesheet; everything else in the app is styled with Tailwind only.
import "leaflet/dist/leaflet.css";

import Providers from "./providers";
import AppShell from "@/components/layout/AppShell";
import InstallPrompt from "@/components/ui/InstallPrompt";
import HireMateAssistant from "@/components/assistant/HireMateAssistant";

export const metadata: Metadata = {
  title: "HireMate — Find Daily Work",
  description: "Find daily wage work near you. No CV needed. Cook, Driver, Plumber and more.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/logo192.png" },
  appleWebApp: { capable: true, title: "HireMate", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#006491",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-app" suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
          <InstallPrompt />
          <HireMateAssistant />
        </Providers>
      </body>
    </html>
  );
}