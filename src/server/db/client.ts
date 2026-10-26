/**
 * MySQL connection pool and Drizzle client.
 *
 * A single pool is shared across the process. Route handlers, services and
 * the Socket.IO server all go through this module, so transaction boundaries
 * and connection limits are consistent.
 */
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../config/env";
import * as schema from "./schema";

let pool: mysql.Pool | null = null;
let db: MySql2Database<typeof schema> | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    if (!env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not configured. Set it in your environment (see .env.example).",
      );
    }
    pool = mysql.createPool({
      uri: env.DATABASE_URL,
      connectionLimit: env.MYSQL_POOL_MAX,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      // mysql2 accepts `ssl` when TLS is required by the provider.
      ...(env.MYSQL_TLS ? { ssl: { rejectUnauthorized: true } } : {}),
      // Return DECIMAL/BIGINT as strings already (mysql2 default); dates as JS Date.
      dateStrings: false,
    });
  }
  return pool;
}

export function getDb(): MySql2Database<typeof schema> {
  if (!db) {
    db = drizzle(getPool(), { schema, mode: "default" });
  }
  return db;
}

/** Used by test/CLI tooling that needs an isolated pool (e.g. dropped schemas). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/** Raw pool access for health checks and migration tooling. */
export function rawPool(): mysql.Pool {
  return getPool();
}

export { schema };
export type Database = MySql2Database<typeof schema>;
