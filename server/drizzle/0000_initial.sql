CREATE TABLE "cah_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"pack_name" text NOT NULL,
	"card_type" text NOT NULL,
	"text" text NOT NULL,
	"pick" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_nsfw" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "game_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"position" integer NOT NULL,
	"entry" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"name" text NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"connected" boolean DEFAULT true NOT NULL,
	"round_vote" text,
	"round_voted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "game_players_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "game_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_selected_categories" (
	"game_id" text NOT NULL,
	"category" text NOT NULL,
	CONSTRAINT "game_selected_categories_game_id_category_pk" PRIMARY KEY("game_id","category")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"phase" text DEFAULT 'category_select' NOT NULL,
	"waiting_for_players" boolean DEFAULT false NOT NULL,
	"game_completed" boolean DEFAULT false NOT NULL,
	"current_q_cat" text DEFAULT '' NOT NULL,
	"current_q_content" text DEFAULT '' NOT NULL,
	"timeout_start" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_history" ADD CONSTRAINT "game_history_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_questions" ADD CONSTRAINT "game_questions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_selected_categories" ADD CONSTRAINT "game_selected_categories_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_questions_game_cat" ON "game_questions" USING btree ("game_id","category");