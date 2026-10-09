import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui";
import { storeConfig } from "@/theme/store.config";
import { tokens, tokensToCssVariables } from "@/theme/tokens";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-family", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: `${storeConfig.name} — ${storeConfig.tagline}`,
    template: `%s | ${storeConfig.name}`,
  },
  description: storeConfig.tagline,
};

export const viewport: Viewport = { themeColor: tokens.color.background };

const rootVariables = `:root{${Object.entries(tokensToCssVariables(tokens))
  .map(([name, value]) => `${name}:${value}`)
  .join(";")}}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${sans.variable} h-full antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: rootVariables }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <a
            href="#konten"
            className="focus:bg-primary focus:text-on-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
          >
            Lewati ke konten
          </a>
          <Header />
          <main id="konten" className="flex-1">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
