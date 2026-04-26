import { migrate as drizzleMigrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import { join } from "path";
import { db } from "./db";

const MIGRATIONS_FOLDER = join(import.meta.dir, "../drizzle");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

async function ensureMigrationJournal(): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function getLastRecordedMigration() {
  const rows = await db.execute<{ id: number; hash: string; created_at: number }>(sql`
    SELECT id, hash, created_at
    FROM ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
    ORDER BY created_at DESC
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function schemaMatchesLatestPush(): Promise<boolean> {
  const result = await db.execute<{ has_games_password: boolean; has_cah_games_password: boolean; has_google_accounts: boolean }>(sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'games' AND column_name = 'password_hash'
      ) AS has_games_password,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cah_games' AND column_name = 'password_hash'
      ) AS has_cah_games_password,
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'google_accounts'
      ) AS has_google_accounts
  `);

  const row = result[0];
  return Boolean(row?.has_games_password && row?.has_cah_games_password && row?.has_google_accounts);
}

async function baselineExistingSchema(): Promise<void> {
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });

  for (const migration of migrations) {
    await db.execute(sql`
      INSERT INTO ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (hash, created_at)
      SELECT ${migration.hash}, ${migration.folderMillis}
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
        WHERE created_at = ${migration.folderMillis}
      )
    `);
  }
}

export async function migrate(): Promise<void> {
  await ensureMigrationJournal();

  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  const lastRecordedMigration = await getLastRecordedMigration();
  const latestKnownMigration = migrations.at(-1) ?? null;
  const journalIsBehindLatestSchema = !lastRecordedMigration
    || (latestKnownMigration !== null
      && Number(lastRecordedMigration.created_at) < latestKnownMigration.folderMillis);

  if (journalIsBehindLatestSchema && await schemaMatchesLatestPush()) {
    await baselineExistingSchema();
  }

  await drizzleMigrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

