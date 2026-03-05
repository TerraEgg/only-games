import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Admin user ──────────────────────────────────────────────────
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin user created  (username: admin / password: admin123)`);

  // ── Categories ──────────────────────────────────────────────────
  const categories = [
    { name: "Action", slug: "action", icon: "Zap", sortOrder: 1 },
    { name: "Puzzle", slug: "puzzle", icon: "Puzzle", sortOrder: 2 },
    { name: "Racing", slug: "racing", icon: "Car", sortOrder: 3 },
    { name: "Sports", slug: "sports", icon: "Trophy", sortOrder: 4 },
    { name: "Strategy", slug: "strategy", icon: "Brain", sortOrder: 5 },
    { name: "Adventure", slug: "adventure", icon: "Compass", sortOrder: 6 },
    { name: "Arcade", slug: "arcade", icon: "Joystick", sortOrder: 7 },
    { name: "Multiplayer", slug: "multiplayer", icon: "Users2", sortOrder: 8 },
    { name: "Simulation", slug: "simulation", icon: "Cpu", sortOrder: 9 },
    { name: "Horror", slug: "horror", icon: "Skull", sortOrder: 10 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✓ ${categories.length} categories created`);

  // ── Sample games (optional — gives the UI something to show) ───
  const actionCat = await prisma.category.findUnique({
    where: { slug: "action" },
  });
  const puzzleCat = await prisma.category.findUnique({
    where: { slug: "puzzle" },
  });

  if (actionCat) {
    await prisma.game.upsert({
      where: { slug: "sample-action-game" },
      update: {},
      create: {
        title: "Sample Action Game",
        slug: "sample-action-game",
        url: "https://html5.gamedistribution.com/rvvASMiM/3f23e23a47a24f39bfa9e10e4904fb0d/index.html",
        description: "A sample action game to test the platform.",
        categoryId: actionCat.id,
        isActive: true,
        isFeatured: true,
      },
    });
  }

  if (puzzleCat) {
    await prisma.game.upsert({
      where: { slug: "sample-puzzle-game" },
      update: {},
      create: {
        title: "Sample Puzzle Game",
        slug: "sample-puzzle-game",
        url: "https://html5.gamedistribution.com/rvvASMiM/3f23e23a47a24f39bfa9e10e4904fb0d/index.html",
        description: "A sample puzzle game to test the platform.",
        categoryId: puzzleCat.id,
        isActive: true,
      },
    });
  }

  console.log(`✓ Sample games created`);
  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
