import { and, eq } from 'drizzle-orm';
import { APIError } from 'better-auth';
import { accounts, verifications } from '@nhie/db/schema';
import { auth } from '$lib/server/auth';
import { hashPassword } from '$lib/server/auth/password';
import { db } from '$lib/server/db';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseResetUserId(value: string): string | null {
	const trimmed = value.trim();
	return UUID_RE.test(trimmed) ? trimmed : null;
}

export function resetPasswordErrorMessage(err: unknown, maxLength = 128): string {
	if (err instanceof APIError) {
		const code = err.body?.code;
		switch (code) {
			case 'PASSWORD_TOO_SHORT':
				return 'Password must be at least 8 characters.';
			case 'PASSWORD_TOO_LONG':
				return `Password must be at most ${maxLength} characters.`;
			case 'INVALID_TOKEN':
			case 'TOKEN_EXPIRED':
				return 'This reset link is invalid or has expired.';
			default:
				break;
		}
	}

	if (err instanceof Error) {
		const message = err.message.toLowerCase();
		if (message.includes('invalid input syntax for type uuid')) {
			return 'This reset link is invalid or has expired.';
		}
		if (message.includes('relation "accounts" does not exist')) {
			return 'Password reset is temporarily unavailable. Please try again later.';
		}
	}

	return 'Could not reset your password. Please try again or request a new link.';
}

async function resetPasswordInDatabase(userId: string, password: string, token: string) {
	const hashedPassword = await hashPassword(password);

	const updated = await db
		.update(accounts)
		.set({ password: hashedPassword, updatedAt: new Date() })
		.where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
		.returning({ id: accounts.id });

	if (updated.length === 0) {
		await db
			.insert(accounts)
			.values({
				id: crypto.randomUUID(),
				userId,
				accountId: userId,
				providerId: 'credential',
				password: hashedPassword,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [accounts.providerId, accounts.accountId],
				set: { password: hashedPassword, updatedAt: new Date() },
			});
	}

	await db
		.delete(verifications)
		.where(eq(verifications.identifier, `reset-password:${token}`));
}

export async function applyPasswordReset(
	userId: string,
	password: string,
	token: string,
	headers: Headers
) {
	try {
		await auth.api.resetPassword({
			body: { newPassword: password, token },
			headers,
			asResponse: false,
		});
		return;
	} catch (err) {
		console.error('[auth] Better Auth resetPassword failed, falling back to direct DB:', err);
	}

	await resetPasswordInDatabase(userId, password, token);
}
