import Database from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join, extname } from "path";

interface MigrationFile {
  id: string;
  filename: string;
  path: string;
  sql: string;
  description: string;
}

// Migration history tracking
function createMigrationsTable(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Mapping from old migration IDs to new ones for backward compatibility
const migrationIdMapping: Record<string, string> = {
  "001_create_categories_table": "20240926_000000_create_categories_table",
  "002_create_cah_cards_table": "20240926_000001_create_cah_cards_table",
  "003_migrate_legacy_categories": "20240926_000002_migrate_legacy_categories"
};

function hasMigrationBeenApplied(db: Database, migrationId: string): boolean {
  // Check for the new migration ID
  let result = db.prepare("SELECT id FROM migrations WHERE id = ?").get(migrationId);
  if (result) return true;

  // Check for the old migration ID (for backward compatibility)
  const oldId = Object.keys(migrationIdMapping).find(key => migrationIdMapping[key] === migrationId);
  if (oldId) {
    result = db.prepare("SELECT id FROM migrations WHERE id = ?").get(oldId);
    if (result) {
      // Mark the new migration ID as applied to avoid re-running
      markMigrationApplied(db, migrationId, `Migrated from ${oldId}`);
      return true;
    }
  }

  return false;
}

function markMigrationApplied(db: Database, migrationId: string, name: string) {
  db.prepare("INSERT INTO migrations (id, name) VALUES (?, ?)").run(migrationId, name);
}

function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = join(import.meta.dir, "migrations");

  try {
    const files = readdirSync(migrationsDir)
      .filter(file => extname(file) === ".sql")
      .sort() // Sort by filename (timestamp-based naming ensures correct order)
      .map(filename => {
        const filePath = join(migrationsDir, filename);
        const sql = readFileSync(filePath, "utf-8");

        // Extract migration ID from filename (everything before first underscore after timestamp)
        const id = filename.replace(/\.sql$/, "");

        // Extract description from SQL comments
        const descriptionMatch = sql.match(/-- Description:\s*(.+)/i);
        const description = descriptionMatch ? descriptionMatch[1].trim() : filename;

        return {
          id,
          filename,
          path: filePath,
          sql,
          description
        };
      });

    return files;
  } catch (error) {
    console.error("Failed to read migration files:", error);
    return [];
  }
}

function runSqlMigration(db: Database, migration: MigrationFile) {
  if (hasMigrationBeenApplied(db, migration.id)) {
    console.log(`Migration ${migration.id} (${migration.description}) already applied, skipping...`);
    return;
  }

  console.log(`Applying migration ${migration.id}: ${migration.description}`);

  try {
    db.exec("BEGIN TRANSACTION");

    // Special handling for the legacy categories migration
    if (migration.id === "20240926_000002_migrate_legacy_categories") {
      runLegacyCategoriesMigration(db);
    } else {
      // Execute the SQL file
      db.exec(migration.sql);
    }

    markMigrationApplied(db, migration.id, migration.description);
    db.exec("COMMIT");
    console.log(`✓ Migration ${migration.id} applied successfully`);
  } catch (error) {
    db.exec("ROLLBACK");
    console.error(`✗ Failed to apply migration ${migration.id}:`, error);
    throw error;
  }
}

function runLegacyCategoriesMigration(db: Database) {
  // Check if legacy table exists and has data
  const legacyTableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='catagories'
  `).get();

  if (legacyTableExists) {
    console.log("Found legacy 'catagories' table, migrating data...");

    // First ensure the categories table exists with proper schema
    const categoriesExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='categories'
    `).get();

    if (!categoriesExists) {
      throw new Error("Categories table must exist before running legacy migration");
    }

    // Check if we need to add missing columns to categories table
    const columns = db.prepare("PRAGMA table_info(categories)").all() as Array<{ name: string }>;
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('is_nsfw')) {
      db.exec("ALTER TABLE categories ADD COLUMN is_nsfw BOOLEAN NOT NULL DEFAULT FALSE;");
      console.log("Added is_nsfw column to categories table");
    }

    if (!columnNames.includes('updated_at')) {
      db.exec("ALTER TABLE categories ADD COLUMN updated_at DATETIME;");
      db.exec("UPDATE categories SET updated_at = created_at WHERE updated_at IS NULL;");
      console.log("Added updated_at column to categories table");
    }

    // Migrate data from old table to new table (legacy table doesn't have is_nsfw column)
    db.exec(`
      INSERT OR IGNORE INTO categories (name, questions, is_nsfw, created_at, updated_at)
      SELECT name, questions, 0 as is_nsfw, created_at, created_at
      FROM catagories;
    `);

    const migratedCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
    console.log(`Migrated ${migratedCount.count} categories from legacy table`);

    // Drop the old table
    db.exec("DROP TABLE catagories;");
    console.log("Dropped legacy 'catagories' table");
  } else {
    console.log("No legacy 'catagories' table found, skipping migration");
  }
}

export function migrate(db: Database) {
  console.log("Running database migrations...");

  // Ensure migrations table exists
  createMigrationsTable(db);

  // Get all migration files
  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log("No migration files found");
    return;
  }

  // Run all migrations
  for (const migrationFile of migrationFiles) {
    runSqlMigration(db, migrationFile);
  }

  console.log("All migrations completed successfully!");
}

export function getMigrationStatus(db: Database) {
  createMigrationsTable(db);
  const result = db.prepare("SELECT id, name, applied_at FROM migrations ORDER BY applied_at").all();
  return result;
}

export function listAvailableMigrations() {
  const migrationFiles = getMigrationFiles();
  return migrationFiles.map(m => ({
    id: m.id,
    filename: m.filename,
    description: m.description
  }));
}

// Utility function to create a new migration file
export function createMigrationFile(description: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').replace('Z', '');
  const filename = `${timestamp}_${description.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}.sql`;
  const filepath = join(import.meta.dir, "migrations", filename);

  const template = `-- Migration: ${description}
-- Description: ${description}

-- Add your SQL migration here
`;

  try {
    require("fs").writeFileSync(filepath, template);
    console.log(`Created migration file: ${filename}`);
    console.log(`Path: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error("Failed to create migration file:", error);
    throw error;
  }
}

// Utility function to rollback last migration (for development)
// Note: This is simplified and may not handle all edge cases
export function rollbackLastMigration(db: Database) {
  createMigrationsTable(db);

  const lastMigration = db.prepare("SELECT id, name FROM migrations ORDER BY applied_at DESC LIMIT 1").get() as { id: string, name: string } | undefined;

  if (!lastMigration) {
    console.log("No migrations to rollback");
    return;
  }

  console.log(`Rolling back migration ${lastMigration.id}: ${lastMigration.name}`);

  try {
    db.exec("BEGIN TRANSACTION");

    // For SQL-based migrations, we can't automatically determine the down migration
    // This is a limitation of using pure SQL files
    console.log("⚠️  Warning: Rollback for SQL-based migrations is not fully automated.");
    console.log("   You may need to manually reverse the changes in the SQL file.");
    console.log("   Removing migration record from tracking table...");

    db.prepare("DELETE FROM migrations WHERE id = ?").run(lastMigration.id);
    db.exec("COMMIT");
    console.log(`✓ Migration ${lastMigration.id} record removed from tracking table`);
    console.log("   Note: Database schema changes were NOT automatically reversed.");
  } catch (error) {
    db.exec("ROLLBACK");
    console.error(`✗ Failed to rollback migration ${lastMigration.id}:`, error);
    throw error;
  }
}
