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
        {/* Google Consent Mode v2 — must run before any Google tags */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 500
              });
            `,
          }}
        />
        {/* Google Funding Choices CMP — shows consent dialog in EEA/UK/CH */}
        <script
          async
          src={`https://fundingchoicesmessages.google.com/i/pub-1525573862471709?ers=1`}
          nonce=""
        />
        <script
          nonce=""
          dangerouslySetInnerHTML={{
            __html: `(function() {function signalGooglefcPresent(){if(!window.frames['googlefcPresent']){if(document.body){var i=document.createElement('iframe');i.style='width:0;height:0;border:none;z-index:-1000;left:-1000px;top:-1000px;';i.style.display='none';i.name='googlefcPresent';document.body.appendChild(i)}else{setTimeout(signalGooglefcPresent,0)}}};signalGooglefcPresent()})();`,
          }}
        />
        {/* AdSense — loaded after consent defaults are set */}
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
