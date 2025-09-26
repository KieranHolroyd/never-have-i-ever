-- Migration: Create categories table
-- Description: Creates the categories table for Never Have I Ever game data
CREATE TABLE IF NOT EXISTS
	categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		questions JSON NOT NULL DEFAULT '[]',
		is_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);

CREATE INDEX IF NOT EXISTS idx_categories_is_nsfw ON categories (is_nsfw);