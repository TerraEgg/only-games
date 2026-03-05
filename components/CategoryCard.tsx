import Link from "next/link";
import {
  Gamepad2,
  Puzzle,
  Car,
  Trophy,
  Brain,
  Compass,
  Joystick,
  Users2,
  Cpu,
  Skull,
  Swords,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Gamepad2: <Gamepad2 className="h-6 w-6" />,
  Puzzle: <Puzzle className="h-6 w-6" />,
  Car: <Car className="h-6 w-6" />,
  Trophy: <Trophy className="h-6 w-6" />,
  Brain: <Brain className="h-6 w-6" />,
  Compass: <Compass className="h-6 w-6" />,
  Joystick: <Joystick className="h-6 w-6" />,
  Users2: <Users2 className="h-6 w-6" />,
  Cpu: <Cpu className="h-6 w-6" />,
  Skull: <Skull className="h-6 w-6" />,
  Swords: <Swords className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
};

interface CategoryCardProps {
  slug: string;
  name: string;
  icon: string;
  gameCount: number;
}

export default function CategoryCard({
  slug,
  name,
  icon,
  gameCount,
}: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-4 transition hover:border-violet-500/30 hover:bg-zinc-900"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition group-hover:bg-violet-500/20">
        {iconMap[icon] ?? <Gamepad2 className="h-6 w-6" />}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
        <p className="text-xs text-zinc-500">
          {gameCount} {gameCount === 1 ? "game" : "games"}
        </p>
      </div>
    </Link>
  );
}
