import type { Metadata } from "next";

// Self-hosted fonts (bundled from npm) instead of next/font/google, since
// this sandbox can't reach fonts.googleapis.com at build time.
// Plus Jakarta Sans for display/headings, Inter for body — modern,
// highly readable, premium-tech register.
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Study Squad",
  description:
    "Find your study squad — peer-matched six-member study teams for HSC and admission-test aspirants.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="bg-app min-h-full flex flex-col bg-bg text-text font-sans">
        <Navbar />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
