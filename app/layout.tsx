import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CommandListener from "@/components/CommandListener";
import DataProvider from "@/components/DataProvider";
import CacheToast from "@/components/CacheToast";
import CookieSync from "@/components/CookieSync";
import ThemeProvider from "@/components/ThemeProvider";
import GuestTracker from "@/components/GuestTracker";
import PageTracker from "@/components/PageTracker";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "OnlyGames — Play Free Games Online",
  description:
    "Your ultimate destination for free online games. Browse hundreds of games across every genre.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1525573862471709"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <ThemeProvider>
            <DataProvider>
              <CommandListener />
              <CookieSync />
              <GuestTracker />
              <PageTracker />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <CacheToast />
            </DataProvider>
          </ThemeProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
