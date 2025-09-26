import Database from "bun:sqlite";
import { migrate } from "../../migrate";

interface CahCardPack {
  name: string;
  white: Array<{ text: string; pack: number }>;
  black: Array<{ text: string; pick: number; pack: number }>;
  official: boolean;
}

async function ingestCahCards() {
  const dbPath = `${import.meta.dir}/../../../assets/games/db.sqlite`;
  const db = new Database(dbPath);

  // Run migrations to ensure tables exist
  migrate(db);

  // Read the JSON data
  const jsonPath = `${import.meta.dir}/data/cah-cards.json`;
  const file = Bun.file(jsonPath);

  if (!await file.exists()) {
    console.error(`CAH cards JSON file not found at: ${jsonPath}`);
    process.exit(1);
  }

  const cardPacks: CahCardPack[] = await file.json();

  console.log(`Found ${cardPacks.length} card packs to ingest`);

  // Prepare insert statement
  const insertCard = db.prepare(`
    INSERT INTO cah_cards (pack_name, card_type, text, pick)
    VALUES (?, ?, ?, ?)
  `);

  let totalCardsInserted = 0;

  // Start transaction for better performance
  const transaction = db.transaction(() => {
    for (const pack of cardPacks) {
      console.log(`Processing pack: ${pack.name}`);

      // Insert white cards
      for (const whiteCard of pack.white) {
        insertCard.run(pack.name, 'white', whiteCard.text, null);
        totalCardsInserted++;
      }

      // Insert black cards
      for (const blackCard of pack.black) {
        insertCard.run(pack.name, 'black', blackCard.text, blackCard.pick);
        totalCardsInserted++;
      }
    }
  });

  // Execute transaction
  transaction();

  console.log(`Successfully ingested ${totalCardsInserted} CAH cards into SQLite database`);

  // Close database connection
  db.close();
}

// Run the ingest script
ingestCahCards().catch((error) => {
  console.error('Failed to ingest CAH cards:', error);
  process.exit(1);
});
