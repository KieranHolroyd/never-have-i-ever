-- Migration: Create CAH cards table
-- Description: Creates the cah_cards table for Cards Against Humanity game data
CREATE TABLE IF NOT EXISTS
	cah_cards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		pack_name TEXT NOT NULL,
		card_type TEXT NOT NULL CHECK (card_type IN ('black', 'white')),
		text TEXT NOT NULL,
		pick INTEGER CHECK (
			pick IS NULL
			OR (
				card_type = 'black'
				AND pick > 0
			)
		),
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cah_cards_pack_name ON cah_cards (pack_name);

CREATE INDEX IF NOT EXISTS idx_cah_cards_card_type ON cah_cards (card_type);

CREATE INDEX IF NOT EXISTS idx_cah_cards_pack_type ON cah_cards (pack_name, card_type);