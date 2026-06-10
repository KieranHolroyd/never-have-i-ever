import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users, verifications } from '@nhie/db/schema';
import { db } from '$lib/server/db';
import { sendPasswordResetEmail } from '$lib/server/mailer';
import { getAuthPublicOrigin, AUTH_RESET_PASSWORD_PATH } from '$lib/server/auth/public-origin';
import type { Actions, PageServerLoad } from './$types';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function createResetToken(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		const [user] = await db
			.select({ id: users.id, email: users.email, name: users.name })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		// Always respond the same way so we do not reveal whether the account exists.
		if (!user) {
			return { success: true };
		}

		const token = createResetToken();
		const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
		const origin = getAuthPublicOrigin(url.origin);
		const resetUrl = `${origin}/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent(AUTH_RESET_PASSWORD_PATH)}`;

		try {
			await db.insert(verifications).values({
				id: crypto.randomUUID(),
				identifier: `reset-password:${token}`,
				value: user.id,
				expiresAt,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await sendPasswordResetEmail(user.email, user.name, resetUrl);
		} catch (err) {
			await db
				.delete(verifications)
				.where(eq(verifications.identifier, `reset-password:${token}`))
				.catch(() => {});

			console.error('[auth] Failed to send password reset email:', err);
			const message = err instanceof Error ? err.message : 'Failed to send reset email.';
			if (message.includes('RESEND_API_KEY')) {
				return fail(500, {
					error: 'Email is not configured on this server. Contact support if this persists.',
				});
			}
			return fail(500, {
				error: 'We could not send the reset email. Check the address and try again.',
			});
		}

		return { success: true };
	},
};
