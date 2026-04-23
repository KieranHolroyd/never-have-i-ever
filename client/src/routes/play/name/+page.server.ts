import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateNickname } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user };
};

export const actions: Actions = {
	updateNickname: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not signed in.' });

		const data = await request.formData();
		const nickname = String(data.get('nickname') ?? '').trim();
		if (!nickname || nickname.length > 30) {
			return fail(400, { error: 'Nickname must be 1–30 characters.' });
		}

		await updateNickname(locals.user.id, nickname);
		return { success: true };
	}
};
