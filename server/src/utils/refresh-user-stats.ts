import { sql } from "drizzle-orm";
import { db } from "../db";
import logger from "../logger";

/**
 * Refresh the user-stats materialized views.
 * Uses CONCURRENTLY so reads are never blocked (requires the unique indexes created
 * in migration 0003_user_game_link.sql).
 */
export async function refreshUserStats(): Promise<void> {
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY nhie_user_stats`);
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY cah_user_stats`);
  } catch (err) {
    // Non-fatal: log and continue so a failed refresh never breaks gameplay
    logger.error("Failed to refresh user stats materialized views:", err);
  }
}
