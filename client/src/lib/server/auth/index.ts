import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import * as schema from '@nhie/db/schema';
import * as relations from '@nhie/db/relations';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '$lib/server/mailer';
import { hashPassword, verifyPassword } from './password';

const authSchema = {
	...schema,
	...relations,
	user: schema.users,
	session: schema.sessions,
	account: schema.accounts,
	verification: schema.verifications,
};

const publicOrigin = env.BETTER_AUTH_URL ?? env.PUBLIC_ORIGIN ?? 'http://localhost:5173';

export const auth = betterAuth({
	baseURL: publicOrigin,
	basePath: '/api/auth',
	secret: env.BETTER_AUTH_SECRET ?? env.DATABASE_URL ?? 'dev-secret-change-me',
	database: drizzleAdapter(db, {
		provider: 'pg',
		usePlural: true,
		schema: authSchema,
	}),
	experimental: { joins: true },
	advanced: {
		database: {
			generateId: (options) => {
				if (options.model === 'user' || options.model === 'users') return false;
				return crypto.randomUUID();
			},
		},
	},
	user: {
		modelName: 'users',
		fields: {
			emailVerified: 'email_verified',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
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
		modelName: 'sessions',
		fields: {
			userId: 'user_id',
			expiresAt: 'expires_at',
			ipAddress: 'ip_address',
			userAgent: 'user_agent',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		expiresIn: 60 * 60 * 24 * 30,
	},
	account: {
		modelName: 'accounts',
		fields: {
			userId: 'user_id',
			accountId: 'account_id',
			providerId: 'provider_id',
			accessToken: 'access_token',
			refreshToken: 'refresh_token',
			accessTokenExpiresAt: 'access_token_expires_at',
			refreshTokenExpiresAt: 'refresh_token_expires_at',
			idToken: 'id_token',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		accountLinking: {
			enabled: true,
			trustedProviders: ['google'],
		},
	},
	verification: {
		modelName: 'verifications',
		fields: {
			expiresAt: 'expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, token }) => {
			const callback = encodeURIComponent(`${publicOrigin}/auth/reset-password`);
			const resetUrl = `${publicOrigin}/api/auth/reset-password/${token}?callbackURL=${callback}`;
			await sendPasswordResetEmail(user.email, user.name, resetUrl);
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
			const callback = encodeURIComponent(`${publicOrigin}/profile`);
			const verifyUrl = `${publicOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callback}`;
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
