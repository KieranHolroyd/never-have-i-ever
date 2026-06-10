import { error, isRedirect, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

function resolveCallbackUrl(origin: string, path: string): string {
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export const GET: RequestHandler = async ({ url, request, locals }) => {
	const origin = env.BETTER_AUTH_URL ?? env.PUBLIC_ORIGIN ?? url.origin;
	const redirectPath = url.searchParams.get('redirect') ?? '/profile';
	const callbackURL = resolveCallbackUrl(origin, redirectPath);
	const link = url.searchParams.get('link') === '1';

	try {
		if (link) {
			if (!locals.user) redirect(302, '/auth?redirect=/profile');
			const result = await auth.api.linkSocialAccount({
				body: {
					provider: 'google',
					callbackURL: `${origin}/profile?google_linked=1`,
					errorCallbackURL: `${origin}/profile?google_error=already_linked`,
				},
				headers: request.headers,
			});
			if (result.url) redirect(302, result.url);
			redirect(302, '/profile');
		}

		const result = await auth.api.signInSocial({
			body: { provider: 'google', callbackURL },
			headers: request.headers,
		});
		if (result.url) redirect(302, result.url);
		redirect(302, redirectPath);
	} catch (err) {
		if (isRedirect(err)) throw err;
		console.error('[auth/google]', err);
		error(500, 'Could not start Google sign-in. Please try again.');
	}
};
