import CategoryContent from "@/components/CategoryContent";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const name = params.slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${name} Games — Play Free Online`,
    description: `Browse and play free ${name.toLowerCase()} games online on OnlyGames. New games added regularly.`,
  };
}

export default function CategoryPage({ params }: Props) {
  return <CategoryContent slug={params.slug} />;
}
