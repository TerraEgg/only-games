import CategoryContent from "@/components/CategoryContent";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  // Lightweight — just return the slug as title; real name comes from cache
  const name = params.slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { title: `${name} — OnlyGames` };
}

export default function CategoryPage({ params }: Props) {
  return <CategoryContent slug={params.slug} />;
}
