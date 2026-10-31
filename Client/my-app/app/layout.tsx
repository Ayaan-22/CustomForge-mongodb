import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource/orbitron/latin-400.css";
import "@fontsource/orbitron/latin-600.css";
import "@fontsource/orbitron/latin-700.css";
import "@fontsource/orbitron/latin-800.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import "./globals.css";
import "./forge.css";
import "./forge-navigation.css";
import "./forge-controls.css";
import "./forge-cursor.css";
import { StoreExperience } from "@/components/forge/experience";
import { ComparisonDock } from "@/components/forge/compare-button";


export const metadata: Metadata = {
  title: "CustomForge - Gaming PC & Accessories",
  description: "Premium gaming PCs, components, and accessories",
  icons: { icon: "/forge-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased dark" style={{"--font-orbitron":"Orbitron"} as React.CSSProperties}>
      <body className={`font-sans ${GeistSans.variable}`}>
        <Providers>
          <a className="forge-skip" href="#main-content">
            Skip to content
          </a>
          <div className="min-h-dvh flex flex-col">
            <Navbar />
            <EmailVerificationBanner />
            <main id="main-content" className="flex-1">
              <StoreExperience>{children}</StoreExperience>
            </main>
            <Footer />
          </div>
          <ComparisonDock />
          <Toaster />
          <Sonner />
          {process.env.VERCEL === "1" && <Analytics />}
        </Providers>
      </body>
    </html>
  );
}
