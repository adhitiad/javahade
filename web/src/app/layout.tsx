import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ZustandProviders } from "@/stores/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Javahade — Private Host Booking & Live Streaming",
  description: "Platform premium untuk layanan booking host privat dan interaksi live streaming. Subscribe, book, dan chat dengan creator favorit Anda.",
  manifest: "/manifest.json",
  keywords: ["Javahade", "host booking", "live streaming", "creator", "subscription", "private booking"],
  authors: [{ name: "Javahade Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎭</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ZustandProviders>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </ZustandProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
