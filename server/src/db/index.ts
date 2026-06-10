import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = Bun.env.DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost:5432/nhie";

const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

/**
 * Run fn while holding a Postgres session advisory lock on a dedicated pool
 * connection. Acquire and release must use the same session — using the
 * shared pool for try/unlock separately leaks locks and blocks later advances.
 */
export async function withAdvisoryLock(
  gameId: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const reserved = await client.reserve();
  try {
    const rows = await reserved<{ pg_try_advisory_lock: boolean }[]>`
      SELECT pg_try_advisory_lock(42, abs(hashtext(${gameId}))) AS pg_try_advisory_lock
    `;
    if (!rows[0]?.pg_try_advisory_lock) {
      return false;
    }

    await fn();
    return true;
  } finally {
    try {
      await reserved`
        SELECT pg_advisory_unlock(42, abs(hashtext(${gameId})))
      `;
    } finally {
      reserved.release();
    }
  }
}

export async function closeDatabasePool(): Promise<void> {
  await client.end();
}
