import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { RealtimeProvider } from "@/lib/hooks/useRealtime";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forkify - Alle recepten op 1 plek",
  description: "Jouw persoonlijke kookboek, verrijkt met AI. Scan recepten, zoek slim, en ontdek nieuwe smaken.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} font-sans`}>
        <QueryProvider>
          <RealtimeProvider>
            {children}
          </RealtimeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
