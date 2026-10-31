import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import "./forge-admin.css"
import "./forge-controls.css"
import "./forge-themes.css"
import "./forge-cursor.css"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/app/components/auth-provider" // Import AuthProvider
import {Toaster as Sonner} from "@/components/ui/sonner"
import { QueryProvider } from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"


export const metadata: Metadata = {
  title: "CustomForge Admin Dashboard",
  description: "Admin dashboard for CustomForge",
  icons: { icon: "/forge-icon.svg" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`} style={{"--font-admin-sans":"var(--font-geist-sans)","--font-admin-mono":"var(--font-geist-mono)"} as React.CSSProperties}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="customforge-admin-theme" disableTransitionOnChange>
        <a href="#admin-main-content" className="fa-skip-link">Skip to content</a>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster /><Sonner richColors closeButton position="bottom-right" />
          </AuthProvider>
        </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
