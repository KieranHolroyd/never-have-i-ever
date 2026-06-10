import { env } from '$env/dynamic/private';

export const AUTH_RESET_PASSWORD_PATH = '/auth/reset-password';
export const AUTH_PROFILE_PATH = '/profile';

/** Canonical site origin used for auth redirects and trusted callback URLs. */
export function getAuthPublicOrigin(fallbackOrigin?: string): string {
	return env.BETTER_AUTH_URL ?? env.PUBLIC_ORIGIN ?? fallbackOrigin ?? 'http://localhost:5173';
}

export function getAuthTrustedOrigins(fallbackOrigin?: string): string[] {
	const origins = new Set<string>();

	for (const value of [env.BETTER_AUTH_URL, env.PUBLIC_ORIGIN, fallbackOrigin]) {
		if (!value) continue;
		try {
			const origin = new URL(value).origin;
			origins.add(origin);
			// Allow any path on configured hosts (callback URLs include paths).
			origins.add(`${origin}/*`);
		} catch {
			origins.add(value);
		}
	}

	if (origins.size === 0) {
		origins.add('http://localhost:5173');
		origins.add('http://localhost:5173/*');
	}

	return [...origins];
}
