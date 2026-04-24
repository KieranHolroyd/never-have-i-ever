import { redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/auth?redirect=/profile');
	}

	const userId = locals.user.id;

	const [nhieRows, cahRows, recentNhie, recentCah] = await Promise.all([
		// NHIE stats from materialized view
		db.execute(sql`
			SELECT
				total_games::int,
				games_completed::int,
				total_score::float,
				wins::int
			FROM nhie_user_stats
			WHERE user_id = ${userId}
			LIMIT 1
		`),
		// CAH stats from materialized view
		db.execute(sql`
			SELECT
				total_games::int,
				games_completed::int,
				rounds_won::int,
				wins::int
			FROM cah_user_stats
			WHERE user_id = ${userId}
			LIMIT 1
		`),
		// 5 most recent NHIE games this user played
		db.execute(sql`
			SELECT
				g.id,
				g.game_completed,
				g.created_at,
				gp.score,
				gp.name,
				(SELECT MAX(score) FROM game_players gp2 WHERE gp2.game_id = g.id) AS top_score,
				(SELECT COUNT(*) FROM game_players gp3 WHERE gp3.game_id = g.id) AS player_count
			FROM game_players gp
			JOIN games g ON g.id = gp.game_id
			WHERE gp.user_id = ${userId}
			ORDER BY g.created_at DESC
			LIMIT 5
		`),
		// 5 most recent CAH games this user played
		db.execute(sql`
			SELECT
				g.id,
				g.game_completed,
				g.created_at,
				g.current_round AS rounds_played,
				gp.score,
				gp.name,
				(SELECT MAX(score) FROM cah_game_players gp2 WHERE gp2.game_id = g.id) AS top_score,
				(SELECT COUNT(*) FROM cah_game_players gp3 WHERE gp3.game_id = g.id) AS player_count
			FROM cah_game_players gp
			JOIN cah_games g ON g.id = gp.game_id
			WHERE gp.user_id = ${userId}
			ORDER BY g.created_at DESC
			LIMIT 5
		`),
	]);

	const nhieStats = nhieRows[0] as {
		total_games: number;
		games_completed: number;
		total_score: number;
		wins: number;
	} | undefined;

	const cahStats = cahRows[0] as {
		total_games: number;
		games_completed: number;
		rounds_won: number;
		wins: number;
	} | undefined;

	type RecentNhieGame = {
		id: string;
		game_completed: boolean;
		created_at: string;
		score: number;
		name: string;
		top_score: number;
		player_count: number;
	};

	type RecentCahGame = {
		id: string;
		game_completed: boolean;
		created_at: string;
		rounds_played: number;
		score: number;
		name: string;
		top_score: number;
		player_count: number;
	};

	const recentNhieGames = (recentNhie as unknown as RecentNhieGame[]) ?? [];
	const recentCahGames = (recentCah as unknown as RecentCahGame[]) ?? [];

	return {
		user: locals.user,
		nhieStats: nhieStats ?? { total_games: 0, games_completed: 0, total_score: 0, wins: 0 },
		cahStats: cahStats ?? { total_games: 0, games_completed: 0, rounds_won: 0, wins: 0 },
		recentNhieGames,
		recentCahGames,
	};
};
