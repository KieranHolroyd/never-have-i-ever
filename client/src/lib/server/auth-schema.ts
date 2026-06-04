import {
	pgTable,
	text,
	uuid,
	timestamp,
	index,
	boolean,
	jsonb,
} from 'drizzle-orm/pg-core';
import type { Settings } from '$lib/types';

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	nickname: text('nickname').notNull(),
	email_verified: boolean('email_verified').notNull().default(false),
	preferences: jsonb('preferences').$type<Settings>().notNull().default({}),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userSessions = pgTable(
	'user_sessions',
	{
		id: text('id').primaryKey(),
		user_id: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
		created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		userIdIdx: index('idx_user_sessions_user_id').on(t.user_id),
	})
);

/** Stores short-lived tokens for password reset and email verification. */
export const authTokens = pgTable(
	'auth_tokens',
	{
		id: text('id').primaryKey(),
		user_id: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(), // 'password_reset' | 'email_verification'
		expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
		created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		userIdIdx: index('idx_auth_tokens_user_id').on(t.user_id),
	})
);

/** Links a Google account to a user. One user can have one Google account. */
export const googleAccounts = pgTable(
	'google_accounts',
	{
		google_id: text('google_id').primaryKey(),
		user_id: uuid('user_id')
			.notNull()
			.unique()
			.references(() => users.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		userIdIdx: index('idx_google_accounts_user_id').on(t.user_id),
	})
);

export type User = typeof users.$inferSelect;

/** Columns safe to read before `preferences` migration is applied. */
export const userCoreColumns = {
	id: users.id,
	email: users.email,
	password_hash: users.password_hash,
	nickname: users.nickname,
	email_verified: users.email_verified,
	created_at: users.created_at,
	updated_at: users.updated_at
};

export type UserCoreRow = {
	id: string;
	email: string;
	password_hash: string;
	nickname: string;
	email_verified: boolean;
	created_at: Date;
	updated_at: Date;
};

export function withDefaultPreferences(row: UserCoreRow, preferences: Settings = {}): User {
	return { ...row, preferences };
}
export type UserSession = typeof userSessions.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type GoogleAccount = typeof googleAccounts.$inferSelect;
