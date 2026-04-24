import { redirect, error } from '@sveltejs/kit';
import {
	exchangeCodeForProfile,
	OAUTH_STATE_COOKIE,
	OAUTH_LINK_COOKIE,
} from '$lib/server/google-oauth';
import {
	findUserByGoogleId,
	findUserByEmail,
	createUserFromGoogle,
	linkGoogleAccount,
	createSession,
	markEmailVerified,
	SESSION_COOKIE,
} from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get(OAUTH_STATE_COOKIE);
	const isLinking = cookies.get(OAUTH_LINK_COOKIE) === '1';

	// Clean up cookies immediately
	cookies.delete(OAUTH_STATE_COOKIE, { path: '/auth/google/callback' });
	cookies.delete(OAUTH_LINK_COOKIE, { path: '/auth/google/callback' });

	if (!code || !state || state !== storedState) {
		error(400, 'Invalid OAuth state. Please try signing in again.');
	}

	const redirectUri = `${env.PUBLIC_ORIGIN ?? url.origin}/auth/google/callback`;

	let profile: { id: string; email: string; name: string; email_verified: boolean };
	try {
		profile = await exchangeCodeForProfile(code, redirectUri);
	} catch {
		error(502, 'Failed to complete Google sign-in. Please try again.');
	}

	// ── Link mode: attach Google account to the already-signed-in user ─────────
	if (isLinking) {
		if (!locals.user) {
			redirect(302, '/auth?redirect=/profile');
		}

		// Make sure this Google account isn't already linked to someone else
		const existingByGoogle = await findUserByGoogleId(profile.id);
		if (existingByGoogle && existingByGoogle.id !== locals.user.id) {
			redirect(302, '/profile?google_error=already_linked');
		}

		await linkGoogleAccount(locals.user.id, profile.id, profile.email);
		redirect(302, '/profile?google_linked=1');
	}

	// ── Sign-in / sign-up mode ──────────────────────────────────────────────────

	// 1. If this Google ID is already linked → log in
	const existingByGoogle = await findUserByGoogleId(profile.id);
	if (existingByGoogle) {
		const sessionId = await createSession(existingByGoogle.id);
		setSessionCookie(cookies, sessionId);
		redirect(302, '/profile');
	}

	// 2. If the email matches an existing account → link and log in
	const existingByEmail = await findUserByEmail(profile.email);
	if (existingByEmail) {
		await linkGoogleAccount(existingByEmail.id, profile.id, profile.email);
		if (!existingByEmail.email_verified && profile.email_verified) {
			await markEmailVerified(existingByEmail.id);
		}
		const sessionId = await createSession(existingByEmail.id);
		setSessionCookie(cookies, sessionId);
		redirect(302, '/profile');
	}

	// 3. Brand new user — create account from Google profile
	const nickname = profile.name.slice(0, 30) || profile.email.split('@')[0].slice(0, 30);
	const user = await createUserFromGoogle(profile.id, profile.email, nickname);
	const sessionId = await createSession(user.id);
	setSessionCookie(cookies, sessionId);
	redirect(302, '/profile');
};

function setSessionCookie(cookies: Parameters<RequestHandler>[0]['cookies'], sessionId: string) {
	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 30,
	});
}
