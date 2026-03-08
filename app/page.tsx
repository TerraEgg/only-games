import HomeContent from "@/components/HomeContent";

export const metadata = {
  title: "OnlyGames — Play Free Games Online",
  description:
    "Your ultimate destination for free online games. Browse hundreds of games across every genre.",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "OnlyGames",
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://only-games-phi.vercel.app",
            description: "Your ultimate destination for free online games. Browse hundreds of games across every genre.",
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "https://only-games-phi.vercel.app"}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <HomeContent />
    </>
  );
}
