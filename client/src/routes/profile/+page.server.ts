import { fail, redirect } from '@sveltejs/kit';
import { sql, eq, and } from 'drizzle-orm';
import { accounts } from '@nhie/db/schema';
import { db } from '$lib/server/db';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, request }) => {
	if (!locals.user) {
		redirect(302, '/auth?redirect=/profile');
	}

	const userId = locals.user.id;

	const [nhieRows, cahRows, recentNhie, recentCah, googleRows] = await Promise.all([
		db.execute(sql`
			SELECT
				COUNT(DISTINCT gp.game_id)::int AS total_games,
				COUNT(DISTINCT gp.game_id) FILTER (WHERE g.game_completed)::int AS games_completed,
				COALESCE(SUM(gp.score), 0)::float AS total_score,
				COUNT(DISTINCT gp.game_id) FILTER (
					WHERE g.game_completed
						AND gp.score = (
							SELECT MAX(gp2.score) FROM game_players gp2 WHERE gp2.game_id = gp.game_id
						)
				)::int AS wins
			FROM game_players gp
			JOIN games g ON g.id = gp.game_id
			WHERE gp.user_id = ${userId}
		`),
		db.execute(sql`
			SELECT
				COUNT(DISTINCT gp.game_id)::int AS total_games,
				COUNT(DISTINCT gp.game_id) FILTER (WHERE g.game_completed)::int AS games_completed,
				COALESCE(SUM(gp.score), 0)::int AS rounds_won,
				COUNT(DISTINCT gp.game_id) FILTER (
					WHERE g.game_completed
						AND gp.score = (
							SELECT MAX(gp2.score) FROM cah_game_players gp2 WHERE gp2.game_id = gp.game_id
						)
				)::int AS wins
			FROM cah_game_players gp
			JOIN cah_games g ON g.id = gp.game_id
			WHERE gp.user_id = ${userId}
		`),
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
		db
			.select({ accountId: accounts.accountId })
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'google')))
			.limit(1),
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

	let googleAccount: { google_id: string; email: string } | null = null;
	try {
		const listed = await auth.api.listUserAccounts({ headers: request.headers });
		const google = listed.find((a) => a.providerId === 'google');
		if (google) {
			googleAccount = { google_id: google.accountId, email: locals.user.email };
		}
	} catch {
		const google = googleRows.find((row) => row.accountId);
		if (google) {
			googleAccount = { google_id: google.accountId, email: locals.user.email };
		}
	}

	return {
		user: locals.user,
		nhieStats: nhieStats ?? { total_games: 0, games_completed: 0, total_score: 0, wins: 0 },
		cahStats: cahStats ?? { total_games: 0, games_completed: 0, rounds_won: 0, wins: 0 },
		recentNhieGames,
		recentCahGames,
		googleAccount,
	};
};

export const actions: Actions = {
	update_nickname: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { action: 'update_nickname', error: 'Not authenticated.' });
		const data = await request.formData();
		const nickname = String(data.get('nickname') ?? '').trim();
		if (nickname.length < 1 || nickname.length > 30)
			return fail(400, { action: 'update_nickname', error: 'Nickname must be 1–30 characters.' });

		try {
			await auth.api.updateUser({
				body: { name: nickname },
				headers: request.headers,
			});
		} catch {
			return fail(400, { action: 'update_nickname', error: 'Failed to update nickname.' });
		}
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

		try {
			await auth.api.verifyPassword({ body: { password }, headers: request.headers });
		} catch {
			return fail(400, { action: 'update_email', error: 'Incorrect password.' });
		}

		try {
			await auth.api.changeEmail({
				body: { newEmail: email, callbackURL: `${env.PUBLIC_ORIGIN ?? ''}/profile` },
				headers: request.headers,
			});
		} catch {
			return fail(400, { action: 'update_email', error: 'That email is already in use.' });
		}
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

		try {
			await auth.api.changePassword({
				body: { currentPassword: current, newPassword: next },
				headers: request.headers,
			});
		} catch {
			return fail(400, { action: 'update_password', error: 'Incorrect current password.' });
		}
		return { action: 'update_password', success: true };
	},

	resend_verification: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { action: 'resend_verification', error: 'Not authenticated.' });
		if (locals.user.email_verified) return { action: 'resend_verification', success: true };
		await auth.api
			.sendVerificationEmail({
				body: { email: locals.user.email, callbackURL: '/profile' },
				headers: request.headers,
			})
			.catch(() => {});
		return { action: 'resend_verification', success: true };
	},

	unlink_google: async ({ request }) => {
		try {
			await auth.api.unlinkAccount({
				body: { providerId: 'google' },
				headers: request.headers,
			});
		} catch {
			return fail(400, { action: 'unlink_google', error: 'Could not unlink Google account.' });
		}
		return { action: 'unlink_google', success: true };
	},
};
