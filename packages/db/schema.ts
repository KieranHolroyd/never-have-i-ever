import {
	pgTable,
	serial,
	text,
	boolean,
	doublePrecision,
	bigint,
	jsonb,
	integer,
	timestamp,
	index,
	primaryKey,
	uuid,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

// ── User accounts (better-auth) ───────────────────────────────────────────────

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: text('email').notNull().unique(),
		name: text('nickname').notNull(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		preferences: jsonb('preferences').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		emailIdx: index('idx_users_email').on(t.email),
	})
);

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		userIdIdx: index('idx_sessions_user_id').on(t.userId),
		expiresAtIdx: index('idx_sessions_expires_at').on(t.expiresAt),
	})
);

export const accounts = pgTable(
	'accounts',
	{
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		idToken: text('id_token'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		userIdIdx: index('idx_accounts_user_id').on(t.userId),
		providerIdx: uniqueIndex('idx_accounts_provider_account').on(t.providerId, t.accountId),
	})
);

export const verifications = pgTable(
	'verifications',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		identifierIdx: index('idx_verifications_identifier').on(t.identifier),
	})
);

// ── Static content ────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	questions: jsonb('questions').notNull().default([]),
	is_nsfw: boolean('is_nsfw').notNull().default(false),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cahCards = pgTable('cah_cards', {
	id: serial('id').primaryKey(),
	pack_name: text('pack_name').notNull(),
	card_type: text('card_type').notNull(),
	text: text('text').notNull(),
	pick: integer('pick'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Game state ────────────────────────────────────────────────────────────────

export const games = pgTable('games', {
	id: text('id').primaryKey(),
	phase: text('phase').notNull().default('category_select'),
	waiting_for_players: boolean('waiting_for_players').notNull().default(false),
	game_completed: boolean('game_completed').notNull().default(false),
	max_players: integer('max_players').notNull().default(20),
	creator_player_id: text('creator_player_id'),
	password_hash: text('password_hash'),
	current_q_cat: text('current_q_cat').notNull().default(''),
	current_q_content: text('current_q_content').notNull().default(''),
	timeout_start: bigint('timeout_start', { mode: 'number' }).notNull().default(0),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlayers = pgTable(
	'game_players',
	{
		game_id: text('game_id')
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		player_id: text('player_id').notNull(),
		name: text('name').notNull(),
		score: doublePrecision('score').notNull().default(0),
		connected: boolean('connected').notNull().default(true),
		round_vote: text('round_vote'),
		round_voted: boolean('round_voted').notNull().default(false),
		user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.game_id, t.player_id] }),
		userIdIdx: index('idx_game_players_user_id').on(t.user_id),
	})
);

export const gameSelectedCategories = pgTable(
	'game_selected_categories',
	{
		game_id: text('game_id')
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		category: text('category').notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.game_id, t.category] }),
	})
);

export const gameQuestions = pgTable(
	'game_questions',
	{
		id: serial('id').primaryKey(),
		game_id: text('game_id')
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		category: text('category').notNull(),
		question: text('question').notNull(),
	},
	(t) => ({
		gameCatIdx: index('idx_game_questions_game_cat').on(t.game_id, t.category),
	})
);

export const gameHistory = pgTable('game_history', {
	id: serial('id').primaryKey(),
	game_id: text('game_id')
		.notNull()
		.references(() => games.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	entry: jsonb('entry').notNull(),
});

// ── CAH game state ────────────────────────────────────────────────────────────

export const cahGames = pgTable('cah_games', {
	id: text('id').primaryKey(),
	phase: text('phase').notNull().default('waiting'),
	max_players: integer('max_players').notNull().default(20),
	creator_player_id: text('creator_player_id'),
	password_hash: text('password_hash'),
	current_judge: text('current_judge'),
	current_black_card: jsonb('current_black_card'),
	current_round: integer('current_round').notNull().default(0),
	selected_packs: jsonb('selected_packs').notNull().default([]),
	round_winner: text('round_winner'),
	max_rounds: integer('max_rounds').notNull().default(10),
	hand_size: integer('hand_size').notNull().default(7),
	game_completed: boolean('game_completed').notNull().default(false),
	black_deck: jsonb('black_deck').notNull().default([]),
	white_deck: jsonb('white_deck').notNull().default([]),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cahGamePlayers = pgTable(
	'cah_game_players',
	{
		game_id: text('game_id')
			.notNull()
			.references(() => cahGames.id, { onDelete: 'cascade' }),
		player_id: text('player_id').notNull(),
		name: text('name').notNull(),
		score: integer('score').notNull().default(0),
		connected: boolean('connected').notNull().default(true),
		hand: jsonb('hand').notNull().default([]),
		is_judge: boolean('is_judge').notNull().default(false),
		user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.game_id, t.player_id] }),
		userIdIdx: index('idx_cah_game_players_user_id').on(t.user_id),
	})
);

export const cahSubmissions = pgTable(
	'cah_submissions',
	{
		id: serial('id').primaryKey(),
		game_id: text('game_id')
			.notNull()
			.references(() => cahGames.id, { onDelete: 'cascade' }),
		player_id: text('player_id').notNull(),
		player_name: text('player_name').notNull(),
		cards: jsonb('cards').notNull(),
		round: integer('round').notNull().default(0),
	},
	(t) => ({
		uniquePlayerRound: index('idx_cah_submissions_game_player').on(t.game_id, t.player_id),
	})
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CahCard = typeof cahCards.$inferSelect;
export type NewCahCard = typeof cahCards.$inferInsert;
export type CahGame = typeof cahGames.$inferSelect;
export type CahGamePlayer = typeof cahGamePlayers.$inferSelect;
export type CahSubmission = typeof cahSubmissions.$inferSelect;
