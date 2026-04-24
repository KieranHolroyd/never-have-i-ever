import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	verifyPassword,
	updateNickname,
	updateEmail,
	updatePassword,
	findUserByEmail,
} from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

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

export const actions: Actions = {
	update_nickname: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'update_nickname', error: 'Not authenticated.' });
		const data = await request.formData();
		const nickname = String(data.get('nickname') ?? '').trim();
		if (nickname.length < 1 || nickname.length > 30)
			return fail(400, { action: 'update_nickname', error: 'Nickname must be 1–30 characters.' });
		await updateNickname(locals.user.id, nickname);
		return { action: 'update_nickname', success: true };
	},

	update_email: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'update_email', error: 'Not authenticated.' });
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			return fail(400, { action: 'update_email', error: 'Invalid email address.' });
		if (!password)
			return fail(400, { action: 'update_email', error: 'Current password is required.' });
		const user = await findUserByEmail(locals.user.email);
		if (!user || !(await verifyPassword(password, user.password_hash)))
			return fail(400, { action: 'update_email', error: 'Incorrect password.' });
		const existing = await findUserByEmail(email);
		if (existing && existing.id !== locals.user.id)
			return fail(400, { action: 'update_email', error: 'That email is already in use.' });
		await updateEmail(locals.user.id, email);
		return { action: 'update_email', success: true };
	},

	update_password: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'update_password', error: 'Not authenticated.' });
		const data = await request.formData();
		const current = String(data.get('current_password') ?? '');
		const next = String(data.get('new_password') ?? '');
		const confirm = String(data.get('confirm_password') ?? '');
		if (!current)
			return fail(400, { action: 'update_password', error: 'Current password is required.' });
		if (next.length < 8)
			return fail(400, { action: 'update_password', error: 'New password must be at least 8 characters.' });
		if (next !== confirm)
			return fail(400, { action: 'update_password', error: 'Passwords do not match.' });
		const user = await findUserByEmail(locals.user.email);
		if (!user || !(await verifyPassword(current, user.password_hash)))
			return fail(400, { action: 'update_password', error: 'Incorrect current password.' });
		await updatePassword(locals.user.id, next);
		return { action: 'update_password', success: true };
	},
};
