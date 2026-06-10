import type { Catagories } from "@nhie/shared";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema";

const DATA_PATH = `${import.meta.dir}/../../assets/data.json`;

export async function seedCategories(): Promise<number> {
	const data = (await Bun.file(DATA_PATH).json()) as Catagories;
	const rows = Object.entries(data).map(([name, category]) => ({
		name,
		questions: category.questions,
		is_nsfw: category.flags.is_nsfw,
	}));

	await db
		.insert(categories)
		.values(rows)
		.onConflictDoUpdate({
			target: categories.name,
			set: {
				questions: sql`excluded.questions`,
				is_nsfw: sql`excluded.is_nsfw`,
				updated_at: new Date(),
			},
		});

	return rows.length;
}
