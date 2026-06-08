import { count } from "drizzle-orm";
import { db } from "../db";
import { cahCards } from "../db/schema";

interface CahCardPack {
	name: string;
	white: Array<{ text: string; pack: number }>;
	black: Array<{ text: string; pick: number; pack: number }>;
	official: boolean;
}

const DATA_PATH = `${import.meta.dir}/../utils/ingest/data/cah-cards.json`;

export async function countCahCards(): Promise<number> {
	const [row] = await db.select({ count: count() }).from(cahCards);
	return row?.count ?? 0;
}

export async function seedCahCards(options: { skipIfPopulated?: boolean } = {}): Promise<number> {
	const existing = await countCahCards();
	if (options.skipIfPopulated && existing > 0) {
		console.log(`[seed] Skipping CAH cards — ${existing} already in database`);
		return 0;
	}

	const file = Bun.file(DATA_PATH);
	if (!(await file.exists())) {
		throw new Error(`CAH cards JSON not found at ${DATA_PATH}`);
	}

	const cardPacks: CahCardPack[] = await file.json();
	let totalInserted = 0;

	for (const pack of cardPacks) {
		const rows = [
			...pack.white.map((c) => ({
				pack_name: pack.name,
				card_type: "white" as const,
				text: c.text,
				pick: null as number | null,
			})),
			...pack.black.map((c) => ({
				pack_name: pack.name,
				card_type: "black" as const,
				text: c.text,
				pick: c.pick,
			})),
		];

		if (rows.length === 0) continue;

		await db.insert(cahCards).values(rows);
		totalInserted += rows.length;
	}

	return totalInserted;
}
