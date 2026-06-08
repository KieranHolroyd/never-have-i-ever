import { count } from "drizzle-orm";
import { migrate } from "../migrate";
import { closeDatabasePool, db } from "../db";
import { categories } from "../db/schema";
import { seedCategories } from "./categories";
import { countCahCards, seedCahCards } from "./cah-cards";

export type SeedMode = "local" | "production";

export async function runSeed(options: {
	mode: SeedMode;
	force?: boolean;
}): Promise<void> {
	const { mode, force = false } = options;

	console.log(`[seed] Target: ${mode} (${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")})`);

	await migrate();
	console.log("[seed] Migrations applied");

	const categoryCount = await seedCategories();
	console.log(`[seed] Upserted ${categoryCount} Never Have I Ever categories`);

	const cahInserted = await seedCahCards({ skipIfPopulated: !force });
	if (cahInserted > 0) {
		console.log(`[seed] Inserted ${cahInserted} Cards Against Humanity cards`);
	}

	const [catRow] = await db.select({ count: count() }).from(categories);
	const cahTotal = await countCahCards();
	console.log(`[seed] Done — ${catRow?.count ?? 0} categories, ${cahTotal} CAH cards`);

	await closeDatabasePool();
}
