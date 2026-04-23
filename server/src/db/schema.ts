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
} from "drizzle-orm/pg-core";

// ── Static content ────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  questions: jsonb("questions").notNull().default([]),
  is_nsfw: boolean("is_nsfw").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cahCards = pgTable("cah_cards", {
  id: serial("id").primaryKey(),
  pack_name: text("pack_name").notNull(),
  card_type: text("card_type").notNull(), // 'black' | 'white'
  text: text("text").notNull(),
  pick: integer("pick"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Game state ────────────────────────────────────────────────────────────────

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  phase: text("phase").notNull().default("category_select"),
  waiting_for_players: boolean("waiting_for_players").notNull().default(false),
  game_completed: boolean("game_completed").notNull().default(false),
  current_q_cat: text("current_q_cat").notNull().default(""),
  current_q_content: text("current_q_content").notNull().default(""),
  timeout_start: bigint("timeout_start", { mode: "number" }).notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlayers = pgTable("game_players", {
  game_id: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  player_id: text("player_id").notNull(),
  name: text("name").notNull(),
  score: doublePrecision("score").notNull().default(0),
  connected: boolean("connected").notNull().default(true),
  round_vote: text("round_vote"),
  round_voted: boolean("round_voted").notNull().default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.game_id, t.player_id] }),
}));

export const gameSelectedCategories = pgTable("game_selected_categories", {
  game_id: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.game_id, t.category] }),
}));

export const gameQuestions = pgTable("game_questions", {
  id: serial("id").primaryKey(),
  game_id: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  question: text("question").notNull(),
}, (t) => ({
  gameCatIdx: index("idx_game_questions_game_cat").on(t.game_id, t.category),
}));

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  game_id: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  entry: jsonb("entry").notNull(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CahCard = typeof cahCards.$inferSelect;
export type NewCahCard = typeof cahCards.$inferInsert;
