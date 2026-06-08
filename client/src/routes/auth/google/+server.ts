import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request, locals }) => {
	const origin = env.PUBLIC_ORIGIN ?? url.origin;
	const callbackURL = url.searchParams.get('redirect') ?? '/profile';
	const link = url.searchParams.get('link') === '1';

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
	redirect(302, callbackURL);
};
