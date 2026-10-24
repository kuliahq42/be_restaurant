/**
 * Seed script (run with `npm run prisma:seed`).
 *
 * 1. Ensures a MASTER admin exists so the login page can be used.
 * 2. Adds a few starter categories the first time the catalog is empty, since
 *    products can only be created under an existing category.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const MASTER_USERNAME = process.env.SEED_MASTER_USERNAME ?? "master";
const MASTER_PASSWORD = process.env.SEED_MASTER_PASSWORD ?? "master123";

const DEFAULT_CATEGORIES = ["Makanan", "Minuman", "Snack", "Dessert"];

async function main() {
  const password = await bcrypt.hash(MASTER_PASSWORD, 10);
  const master = await prisma.admin.upsert({
    where: { username: MASTER_USERNAME },
    update: {},
    create: { username: MASTER_USERNAME, password, role: "MASTER" },
  });
  console.log(`MASTER admin ready -> ${master.username} / ${MASTER_PASSWORD}`);

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
    });
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  } else {
    console.log(`Categories already present (${categoryCount}); skipped.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
