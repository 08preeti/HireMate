import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
// Leaflet's own stylesheet (map tiles, controls, markers). It is a third-party
// library stylesheet; everything else in the app is styled with Tailwind only.
import "leaflet/dist/leaflet.css";

import Providers from "./providers";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";

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
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
          <BottomNav />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
