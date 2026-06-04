import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { users } from './auth-schema';
import type { Settings } from '$lib/types';
import { DEFAULT_SETTINGS, normalizeSettings, parsePreferencesJson } from '$lib/settings-defaults';
import { isMissingColumnError } from './db-errors';

export async function getUserPreferences(userId: string): Promise<Required<Settings>> {
	try {
		const [row] = await db
			.select({ preferences: users.preferences })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		return parsePreferencesJson(row?.preferences);
	} catch (err) {
		if (isMissingColumnError(err)) {
			return { ...DEFAULT_SETTINGS };
		}
		throw err;
	}
}

export async function updateUserPreferences(
	userId: string,
	preferences: Settings
): Promise<Required<Settings>> {
	const normalized = normalizeSettings(preferences);
	try {
		await db
			.update(users)
			.set({ preferences: normalized, updated_at: new Date() })
			.where(eq(users.id, userId));
		return normalized;
	} catch (err) {
		if (isMissingColumnError(err)) {
			console.error(
				'[settings] users.preferences column missing — run server/drizzle/0009_user_preferences.sql'
			);
			return normalized;
		}
		throw err;
	}
}

/** Returns true when the preferences column exists (migration applied). */
export async function preferencesColumnExists(): Promise<boolean> {
	try {
		await db.execute(sql`
			SELECT preferences FROM users LIMIT 0
		`);
		return true;
	} catch (err) {
		if (isMissingColumnError(err)) return false;
		throw err;
	}
}
