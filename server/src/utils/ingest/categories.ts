import type { Catagories } from "@nhie/shared";
import { migrate } from "../../migrate";
import { db } from "../../db";
import { categories } from "../../db/schema";

async function ingestCategories() {
  migrate();

  const data = await Bun.file(
    `${import.meta.dir}/../../../assets/data.json`
  ).json() as Catagories;

  console.log(`Found ${Object.keys(data).length} categories to ingest`);

  const rows = Object.entries(data).map(([name, category]) => ({
    name,
    questions: JSON.stringify(category.questions),
    is_nsfw: category.flags.is_nsfw,
  }));

  await db
    .insert(categories)
    .values(rows)
    .onConflictDoUpdate({
      target: categories.name,
      set: {
        questions: categories.questions,
        is_nsfw: categories.is_nsfw,
        updated_at: new Date().toISOString(),
      },
    });

  console.log(`Successfully ingested ${rows.length} categories into SQLite database`);
}

ingestCategories().catch((error) => {
  console.error('Failed to ingest categories:', error);
  process.exit(1);
});

