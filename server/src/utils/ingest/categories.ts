import Database from "bun:sqlite";
import { Categories } from "../../../types";
import { migrate } from "../../migrate";

async function ingestCategories() {
  const dbPath = `${import.meta.dir}/../../../assets/db.sqlite`;
  const db = new Database(dbPath);

  // Run migrations first to ensure tables exist
  migrate(db);

  // Load and insert categories data
  const categories = await Bun.file(
    `${import.meta.dir}/../../../assets/data.json`
  ).json() as Categories;

  console.log(`Found ${Object.keys(categories).length} categories to ingest`);

  const insertCategory = db.prepare(`
    INSERT OR REPLACE INTO categories (name, questions, is_nsfw, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  let insertedCount = 0;
  for (const [name, category] of Object.entries(categories)) {
    insertCategory.run(name, JSON.stringify(category.questions), category.flags.is_nsfw);
    insertedCount++;
  }

  console.log(`Successfully ingested ${insertedCount} categories into SQLite database`);

  // Close database connection
  db.close();
}

// Run the ingest script
ingestCategories().catch((error) => {
  console.error('Failed to ingest categories:', error);
  process.exit(1);
});
