import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import * as schema from '@nhie/db/schema';
import * as relations from '@nhie/db/relations';
import { verifications } from '@nhie/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '$lib/server/mailer';
import { hashPassword, verifyPassword } from './password';
import { getAuthPublicOrigin, getAuthTrustedOrigins, AUTH_PROFILE_PATH } from './public-origin';

const authSchema = {
	...schema,
	...relations,
	user: schema.users,
	session: schema.sessions,
	account: schema.accounts,
	verification: schema.verifications,
};

const publicOrigin = getAuthPublicOrigin();

export const auth = betterAuth({
	baseURL: publicOrigin,
	basePath: '/api/auth',
	secret: env.BETTER_AUTH_SECRET ?? env.DATABASE_URL ?? 'dev-secret-change-me',
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
		schema: authSchema,
	}),
	trustedOrigins: async (request) =>
		getAuthTrustedOrigins(request ? new URL(request.url).origin : undefined),
	advanced: {
		database: {
			generateId: (options) => {
				if (options.model === 'user' || options.model === 'users') return false;
				return crypto.randomUUID();
			},
		},
	},
	user: {
		additionalFields: {
			preferences: {
				type: 'json',
				required: false,
				defaultValue: {},
				input: false,
			},
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
	},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google'],
		},
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, url, token }) => {
			try {
				await sendPasswordResetEmail(user.email, user.name, url);
			} catch (err) {
				console.error('[auth] Password reset email failed:', err);
				if (token) {
					await db
						.delete(verifications)
						.where(eq(verifications.identifier, `reset-password:${token}`))
						.catch(() => {});
				}
				throw err;
			}
		},
		password: {
			hash: hashPassword,
			verify: async ({ hash, password }) => verifyPassword(hash, password),
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, token }) => {
			const verifyUrl = `${publicOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(AUTH_PROFILE_PATH)}`;
			await sendEmailVerificationEmail(user.email, user.name, verifyUrl);
		},
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
			mapProfileToUser: (profile) => ({
				name: (profile.name ?? profile.email?.split('@')[0] ?? 'Player').slice(0, 30),
				emailVerified: profile.email_verified ?? false,
			}),
		},
	},
	plugins: [sveltekitCookies(getRequestEvent)],
});

export type Session = typeof auth.$Infer.Session;
