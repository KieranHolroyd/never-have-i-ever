import { migrate as drizzleMigrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "path";
import { db } from "./db";

const MIGRATIONS_FOLDER = join(import.meta.dir, "../drizzle");

export function migrate() {
  drizzleMigrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

