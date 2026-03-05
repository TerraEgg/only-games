import SearchContent from "@/components/SearchContent";
import { Suspense } from "react";

export const metadata = { title: "Search — OnlyGames" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
