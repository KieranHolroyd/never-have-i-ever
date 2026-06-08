import { migrate } from "../../migrate";
import { closeDatabasePool } from "../../db";
import { seedCategories } from "../../seed/categories";

async function ingestCategories() {
	await migrate();
	const count = await seedCategories();
	console.log(`Successfully ingested ${count} categories into PostgreSQL`);
	await closeDatabasePool();
}

ingestCategories().catch((error) => {
	console.error("Failed to ingest categories:", error);
	process.exit(1);
});
