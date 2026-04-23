import { migrate as drizzleMigrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "path";
import { db } from "./db";

const MIGRATIONS_FOLDER = join(import.meta.dir, "../drizzle");

export async function migrate(): Promise<void> {
  await drizzleMigrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

