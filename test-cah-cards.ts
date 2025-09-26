import Database from "bun:sqlite";

// Test the CAH card loading logic
const config = { GAME_DATA_DIR: './server/assets/games/' };
const dbPath = `${config.GAME_DATA_DIR}db.sqlite`;
const db = new Database(dbPath);

const packIds = ['CAH Base Set', '2012 Holiday Pack'];

try {
  console.log(`Testing card loading for packs: ${packIds.join(', ')}`);

  // Load black cards from selected packs
  const placeholders = packIds.map(() => '?').join(',');
  const blackCardsQuery = `
    SELECT id, text, pick
    FROM cah_cards
    WHERE card_type = 'black' AND pack_name IN (${placeholders})
  `;
  const blackCardRows = db.prepare(blackCardsQuery).all(...packIds) as Array<{ id: string; text: string; pick: number }>;

  console.log(`Loaded ${blackCardRows.length} black cards`);

  // Load white cards from selected packs
  const whiteCardsQuery = `
    SELECT id, text
    FROM cah_cards
    WHERE card_type = 'white' AND pack_name IN (${placeholders})
  `;
  const whiteCardRows = db.prepare(whiteCardsQuery).all(...packIds) as Array<{ id: string; text: string }>;

  console.log(`Loaded ${whiteCardRows.length} white cards`);

  // Show a sample of each
  if (blackCardRows.length > 0) {
    console.log('Sample black card:', blackCardRows[0]);
  }
  if (whiteCardRows.length > 0) {
    console.log('Sample white card:', whiteCardRows[0]);
  }

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}
