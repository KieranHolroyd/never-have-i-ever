import {
	pgTable,
	text,
	uuid,
	timestamp,
	index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	password_hash: text('password_hash').notNull(),
	nickname: text('nickname').notNull(),
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

export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
