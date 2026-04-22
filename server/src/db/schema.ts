import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  questions: text("questions").notNull().default("[]"),
  is_nsfw: integer("is_nsfw", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const cahCards = sqliteTable("cah_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pack_name: text("pack_name").notNull(),
  card_type: text("card_type", { enum: ["black", "white"] }).notNull(),
  text: text("text").notNull(),
  pick: integer("pick"),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CahCard = typeof cahCards.$inferSelect;
export type NewCahCard = typeof cahCards.$inferInsert;
