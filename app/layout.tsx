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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://only-games-phi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OnlyGames — Play Free Games Online",
    template: "%s | OnlyGames",
  },
  description:
    "Your ultimate destination for free online games. Browse hundreds of games across every genre — action, puzzle, racing, strategy and more.",
  keywords: ["free online games", "browser games", "play games online", "HTML5 games", "flash games", "action games", "puzzle games", "racing games"],
  openGraph: {
    type: "website",
    siteName: "OnlyGames",
    title: "OnlyGames — Play Free Games Online",
    description:
      "Your ultimate destination for free online games. Browse hundreds of games across every genre.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "OnlyGames — Play Free Games Online",
    description:
      "Your ultimate destination for free online games. Browse hundreds of games across every genre.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: SITE_URL },
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
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted',
                'analytics_storage': 'granted',
              });
              // For EEA/UK/Swiss visitors the Funding Choices CMP will
              // override these to 'denied' until the user consents.
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 500,
                'region': ['BE','BG','CZ','DK','DE','EE','IE','EL','ES','FR','HR','IT','CY','LV','LT','LU','HU','MT','NL','AT','PL','PT','RO','SI','SK','FI','SE','GB','IS','LI','NO','CH']
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
