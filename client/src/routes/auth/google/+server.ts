import { redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { buildGoogleAuthUrl, OAUTH_STATE_COOKIE, OAUTH_LINK_COOKIE } from '$lib/server/google-oauth';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) => {
	const link = url.searchParams.get('link') === '1';
	const state = randomBytes(16).toString('hex');

	const redirectUri = `${env.PUBLIC_ORIGIN ?? url.origin}/auth/google/callback`;
	const authUrl = buildGoogleAuthUrl(state, redirectUri);

	// CSRF protection: store state in a short-lived http-only cookie
	cookies.set(OAUTH_STATE_COOKIE, state, {
		path: '/auth/google/callback',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 10, // 10 minutes
	});

	if (link) {
		cookies.set(OAUTH_LINK_COOKIE, '1', {
			path: '/auth/google/callback',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 10,
		});
	}

	redirect(302, authUrl);
};
