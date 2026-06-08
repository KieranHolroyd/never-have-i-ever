import { migrate } from "../../migrate";
import { closeDatabasePool } from "../../db";
import { seedCahCards } from "../../seed/cah-cards";

async function ingestCahCards() {
	await migrate();
	const count = await seedCahCards({ skipIfPopulated: true });
	if (count > 0) {
		console.log(`Successfully ingested ${count} CAH cards into PostgreSQL`);
	}
	await closeDatabasePool();
}

ingestCahCards().catch((error) => {
	console.error("Failed to ingest CAH cards:", error);
	process.exit(1);
});
