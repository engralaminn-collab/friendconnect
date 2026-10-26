import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration. Migration SQL is generated from the TypeScript
 * schema and checked into `./drizzle`; it is applied with `npm run db:migrate`.
 */
export default {
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/friendconnect",
  },
  strict: true,
  verbose: true,
} satisfies Config;
