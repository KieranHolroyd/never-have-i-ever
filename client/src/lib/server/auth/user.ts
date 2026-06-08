import type { Settings } from '$lib/types';
import { parsePreferencesJson } from '$lib/settings-defaults';

/** App-facing user shape (nickname + snake_case flags). */
export type AppUser = {
	id: string;
	email: string;
	nickname: string;
	email_verified: boolean;
	preferences: Required<Settings>;
	created_at: Date;
	updated_at: Date;
};

type BetterAuthUser = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string | null;
	preferences?: unknown;
	createdAt: Date;
	updatedAt: Date;
};

export function toAppUser(user: BetterAuthUser): AppUser {
	return {
		id: user.id,
		email: user.email,
		nickname: user.name,
		email_verified: user.emailVerified,
		preferences: parsePreferencesJson(user.preferences),
		created_at: user.createdAt,
		updated_at: user.updatedAt,
	};
}
