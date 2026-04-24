CREATE TABLE "cah_game_players" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"name" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"connected" boolean DEFAULT true NOT NULL,
	"hand" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_judge" boolean DEFAULT false NOT NULL,
	CONSTRAINT "cah_game_players_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "cah_games" (
	"id" text PRIMARY KEY NOT NULL,
	"phase" text DEFAULT 'waiting' NOT NULL,
	"current_judge" text,
	"current_black_card" jsonb,
	"current_round" integer DEFAULT 0 NOT NULL,
	"selected_packs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"round_winner" text,
	"max_rounds" integer DEFAULT 10 NOT NULL,
	"hand_size" integer DEFAULT 7 NOT NULL,
	"game_completed" boolean DEFAULT false NOT NULL,
	"black_deck" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"white_deck" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cah_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"cards" jsonb NOT NULL,
	"round" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cah_game_players" ADD CONSTRAINT "cah_game_players_game_id_cah_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."cah_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cah_submissions" ADD CONSTRAINT "cah_submissions_game_id_cah_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."cah_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cah_submissions_game_player" ON "cah_submissions" USING btree ("game_id","player_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");
