import { env } from '$env/dynamic/private';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const OAUTH_STATE_COOKIE = 'google_oauth_state';
export const OAUTH_LINK_COOKIE = 'google_oauth_link'; // set to '1' when linking

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'online',
		prompt: 'select_account',
	});
	return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForProfile(
	code: string,
	redirectUri: string
): Promise<{ id: string; email: string; name: string; email_verified: boolean }> {
	const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		}),
	});

	if (!tokenRes.ok) {
		throw new Error('Failed to exchange code for token');
	}

	const { access_token } = (await tokenRes.json()) as { access_token: string };

	const userRes = await fetch(GOOGLE_USERINFO_URL, {
		headers: { Authorization: `Bearer ${access_token}` },
	});

	if (!userRes.ok) {
		throw new Error('Failed to fetch Google user info');
	}

	const profile = (await userRes.json()) as {
		sub: string;
		email: string;
		name: string;
		email_verified: boolean;
	};

	return {
		id: profile.sub,
		email: profile.email,
		name: profile.name,
		email_verified: profile.email_verified,
	};
}
