/**
 * Apply versioned SQL migrations from ./drizzle against DATABASE_URL.
 * Usage: npm run db:migrate
 */
import { migrate } from "drizzle-orm/mysql2/migrator";
import { closePool, getDb, rawPool } from "../src/server/db/client";

async function main() {
  const db = getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  const [rows] = await rawPool().query("SHOW TABLES");
  // eslint-disable-next-line no-console
  console.log(
    `Migrations applied. Tables (${(rows as unknown[]).length}):`,
    (rows as Record<string, string>[]).map((r) => Object.values(r)[0]).join(", "),
  );
  await closePool();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err.message);
  process.exit(1);
});
