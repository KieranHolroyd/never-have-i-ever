import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './auth-schema';
import type { Settings } from '$lib/types';
import { normalizeSettings, parsePreferencesJson } from '$lib/settings-defaults';

export async function getUserPreferences(userId: string): Promise<Required<Settings>> {
	const [row] = await db
		.select({ preferences: users.preferences })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	return parsePreferencesJson(row?.preferences);
}

export async function updateUserPreferences(
	userId: string,
	preferences: Settings
): Promise<Required<Settings>> {
	const normalized = normalizeSettings(preferences);
	await db
		.update(users)
		.set({ preferences: normalized, updated_at: new Date() })
		.where(eq(users.id, userId));
	return normalized;
}
