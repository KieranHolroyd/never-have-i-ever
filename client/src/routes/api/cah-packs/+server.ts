import { json, error } from '@sveltejs/kit';
import Database from 'bun:sqlite';
import type { CardPack } from '$lib/types';

export async function GET() {
	try {
		// Connect to the SQLite database
		const dbPath = `${process.cwd()}/../server/assets/games/db.sqlite`;
		const db = new Database(dbPath);

		try {
			// Query to get all unique pack names with card counts
			const query = `
				SELECT
					pack_name as name,
					COUNT(CASE WHEN card_type = 'black' THEN 1 END) as blackCards,
					COUNT(CASE WHEN card_type = 'white' THEN 1 END) as whiteCards
				FROM cah_cards
				GROUP BY pack_name
				ORDER BY pack_name
			`;

			const rows = db.prepare(query).all() as Array<{
				name: string;
				blackCards: number;
				whiteCards: number;
			}>;

			// Transform the data to match the CardPack interface
			// For now, we'll assume all packs are official and mark them as NSFW based on common knowledge
			// In a production system, this metadata would be stored in the database
			const cardPacks: CardPack[] = rows.map(row => ({
				id: row.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
				name: row.name,
				blackCards: row.blackCards,
				whiteCards: row.whiteCards,
				isOfficial: isOfficialPack(row.name),
				isNSFW: isNSFWPack(row.name)
			}));

			return json(cardPacks);
		} finally {
			db.close();
		}
	} catch (err) {
		console.error('Error fetching CAH card packs:', err);
		throw error(500, 'Failed to fetch card packs');
	}
}

// Helper functions to determine pack properties
// These could be moved to a database table in the future for better maintainability
function isOfficialPack(packName: string): boolean {
	const officialPacks = [
		'CAH Base Set',
		'The First Expansion',
		'The Second Expansion',
		'The Third Expansion',
		'The Fourth Expansion',
		'The Fifth Expansion',
		'The Sixth Expansion',
		'Green Box Expansion',
		'Blue Box Expansion',
		'Red Box Expansion',
		'2012 Holiday Pack',
		'2013 Holiday Pack',
		'2014 Holiday Pack',
		'2015 Holiday Pack',
		'PAX East 2013',
		'PAX Prime 2013',
		'PAX East 2014',
		'PAX Prime 2014',
		'PAX East 2015',
		'PAX Prime 2015',
		'House of Cards Against Humanity',
		'AI Expansion',
		'World Wide Web Pack'
	];

	return officialPacks.some(official =>
		packName.toLowerCase().includes(official.toLowerCase())
	);
}

function isNSFWPack(packName: string): boolean {
	const nsfwPacks = [
		'CAH Base Set',
		'The First Expansion',
		'The Second Expansion',
		'The Third Expansion',
		'The Fourth Expansion',
		'The Fifth Expansion',
		'The Sixth Expansion',
		'Green Box Expansion',
		'Blue Box Expansion',
		'Red Box Expansion',
		'2012 Holiday Pack',
		'2013 Holiday Pack',
		'2014 Holiday Pack',
		'2015 Holiday Pack',
		'House of Cards Against Humanity'
	];

	return nsfwPacks.some(nsfw =>
		packName.toLowerCase().includes(nsfw.toLowerCase())
	);
}
