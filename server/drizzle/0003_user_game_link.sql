ALTER TABLE "cah_game_players" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "cah_game_players" ADD CONSTRAINT "cah_game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cah_game_players_user_id" ON "cah_game_players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_game_players_user_id" ON "game_players" USING btree ("user_id");--> statement-breakpoint

-- ── NHIE stats per user ──────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW nhie_user_stats AS
SELECT
  gp.user_id,
  COUNT(DISTINCT gp.game_id)                                                 AS total_games,
  COUNT(DISTINCT gp.game_id) FILTER (WHERE g.game_completed)                 AS games_completed,
  COALESCE(SUM(gp.score), 0)                                                 AS total_score,
  COUNT(DISTINCT gp.game_id) FILTER (
    WHERE g.game_completed
      AND gp.score = (
        SELECT MAX(gp2.score) FROM game_players gp2 WHERE gp2.game_id = gp.game_id
      )
  )                                                                          AS wins
FROM game_players gp
JOIN games g ON g.id = gp.game_id
WHERE gp.user_id IS NOT NULL
GROUP BY gp.user_id;--> statement-breakpoint

CREATE UNIQUE INDEX idx_nhie_user_stats_user_id ON nhie_user_stats (user_id);--> statement-breakpoint

-- ── CAH stats per user ───────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW cah_user_stats AS
SELECT
  gp.user_id,
  COUNT(DISTINCT gp.game_id)                                                 AS total_games,
  COUNT(DISTINCT gp.game_id) FILTER (WHERE g.game_completed)                 AS games_completed,
  COALESCE(SUM(gp.score), 0)                                                 AS rounds_won,
  COUNT(DISTINCT gp.game_id) FILTER (
    WHERE g.game_completed
      AND gp.score = (
        SELECT MAX(gp2.score) FROM cah_game_players gp2 WHERE gp2.game_id = gp.game_id
      )
  )                                                                          AS wins
FROM cah_game_players gp
JOIN cah_games g ON g.id = gp.game_id
WHERE gp.user_id IS NOT NULL
GROUP BY gp.user_id;--> statement-breakpoint

CREATE UNIQUE INDEX idx_cah_user_stats_user_id ON cah_user_stats (user_id);
