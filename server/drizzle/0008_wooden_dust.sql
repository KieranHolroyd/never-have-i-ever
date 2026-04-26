ALTER TABLE "cah_games" ADD COLUMN "max_players" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "max_players" integer DEFAULT 20 NOT NULL;