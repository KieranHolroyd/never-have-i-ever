import Database from "bun:sqlite";

export function migrate(db: Database) {
  db.exec(`
		CREATE TABLE IF NOT EXISTS catagories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,

			questions JSON NOT NULL DEFAULT '[]',

			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`);
}
