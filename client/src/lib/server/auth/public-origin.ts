import { env } from '$env/dynamic/private';

/** Canonical site origin used for auth redirects and trusted callback URLs. */
export function getAuthPublicOrigin(fallbackOrigin?: string): string {
	return env.BETTER_AUTH_URL ?? env.PUBLIC_ORIGIN ?? fallbackOrigin ?? 'http://localhost:5173';
}

export function getAuthTrustedOrigins(fallbackOrigin?: string): string[] {
	const origins = new Set<string>();

	for (const value of [env.BETTER_AUTH_URL, env.PUBLIC_ORIGIN, fallbackOrigin]) {
		if (!value) continue;
		try {
			origins.add(new URL(value).origin);
		} catch {
			origins.add(value);
		}
	}

	if (origins.size === 0) {
		origins.add('http://localhost:5173');
	}

	return [...origins];
}
