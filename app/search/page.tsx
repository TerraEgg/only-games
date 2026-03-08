import SearchContent from "@/components/SearchContent";
import { Suspense } from "react";

export const metadata = {
  title: "Search Games — Browse Free Online Games",
  description: "Search and browse hundreds of free online games. Filter by category, find your next favourite game on OnlyGames.",
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
