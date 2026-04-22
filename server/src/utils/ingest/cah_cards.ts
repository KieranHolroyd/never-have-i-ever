import { migrate } from "../../migrate";
import { db } from "../../db";
import { cahCards } from "../../db/schema";

interface CahCardPack {
  name: string;
  white: Array<{ text: string; pack: number }>;
  black: Array<{ text: string; pick: number; pack: number }>;
  official: boolean;
}

async function ingestCahCards() {
  migrate();

  const jsonPath = `${import.meta.dir}/data/cah-cards.json`;
  const file = Bun.file(jsonPath);

  if (!await file.exists()) {
    console.error(`CAH cards JSON file not found at: ${jsonPath}`);
    process.exit(1);
  }

  const cardPacks: CahCardPack[] = await file.json();
  console.log(`Found ${cardPacks.length} card packs to ingest`);

  let totalCardsInserted = 0;

  for (const pack of cardPacks) {
    console.log(`Processing pack: ${pack.name}`);

    const rows = [
      ...pack.white.map((c) => ({ pack_name: pack.name, card_type: "white" as const, text: c.text, pick: null as number | null })),
      ...pack.black.map((c) => ({ pack_name: pack.name, card_type: "black" as const, text: c.text, pick: c.pick })),
    ];

    if (rows.length === 0) continue;

    await db.insert(cahCards).values(rows);
    totalCardsInserted += rows.length;
  }

  console.log(`Successfully ingested ${totalCardsInserted} CAH cards into SQLite database`);
}

ingestCahCards().catch((error) => {
  console.error('Failed to ingest CAH cards:', error);
  process.exit(1);
});

