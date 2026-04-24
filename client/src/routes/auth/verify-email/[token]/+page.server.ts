import { redirect } from '@sveltejs/kit';
import { consumeAuthToken, markEmailVerified } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = await consumeAuthToken(params.token, 'email_verification');

	if (!user) {
		return { success: false };
	}

	await markEmailVerified(user.id);
	return { success: true, nickname: user.nickname };
};
