import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BanChecker from "@/components/BanChecker";

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
      <body className="flex min-h-screen flex-col">
        <Providers>
          <BanChecker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
