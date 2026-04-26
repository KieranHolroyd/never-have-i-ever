import { db } from "../db";
import { games, gamePlayers, gameSelectedCategories, gameQuestions, gameHistory } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import logger from "../logger";
import type { NHIEPlayer, NHIEGameState, GameHistoryEntry, Question } from "@nhie/shared";
import type { ActiveGamePlayerSummary, ActiveGameSummary } from "../types";

export type GameMetaHash = {
  phase?: string;
  waitingForPlayers?: boolean;
  gameCompleted?: boolean;
  current_q_cat?: string;
  current_q_content?: string;
  /** Epoch ms timestamp, or 0 to clear */
  timeout_start?: number;
};

export interface IGameStateService {
  // ── Lifecycle ──────────────────────────────────────────────────────────
  gameExists(gameId: string): Promise<boolean>;
  createGame(gameId: string): Promise<void>;
  deleteGame(gameId: string): Promise<void>;

  // ── Meta ───────────────────────────────────────────────────────────────
  getGameMeta(gameId: string): Promise<GameMetaHash | null>;
  setGameMeta(gameId: string, fields: GameMetaHash): Promise<void>;

  // ── Players ────────────────────────────────────────────────────────────
  addPlayer(gameId: string, player: NHIEPlayer, userId?: string): Promise<void>;
  getPlayer(gameId: string, playerId: string): Promise<NHIEPlayer | null>;
  getPlayers(gameId: string): Promise<NHIEPlayer[]>;
  updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void>;
  updatePlayerVote(gameId: string, playerId: string, vote: string, voted: boolean): Promise<void>;
  incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void>;
  resetAllPlayerVotes(gameId: string): Promise<void>;
  /** Atomically undo previous vote score, apply new score, record vote, return updated player + all-voted flag. */
  recordVote(gameId: string, playerId: string, voteLabel: string, scoreDelta: number, undoDelta: number): Promise<{ player: NHIEPlayer; allVoted: boolean }>;

  // ── Categories ─────────────────────────────────────────────────────────
  getSelectedCategories(gameId: string): Promise<string[]>;
  addCategory(gameId: string, cat: string): Promise<void>;
  removeCategory(gameId: string, cat: string): Promise<void>;

  // ── Questions ──────────────────────────────────────────────────────────
  initCategoryQuestions(gameId: string, cat: string, questions: string[]): Promise<void>;
  popRandomQuestion(gameId: string, cat: string): Promise<string | null>;
  remainingQuestionCount(gameId: string, cat: string): Promise<number>;

  // ── History ────────────────────────────────────────────────────────────
  pushHistory(gameId: string, entry: GameHistoryEntry): Promise<void>;
  getHistory(gameId: string): Promise<GameHistoryEntry[]>;

  // ── Full state ─────────────────────────────────────────────────────────
  getFullGameState(gameId: string): Promise<NHIEGameState | null>;
  listActiveGames(): Promise<ActiveGameSummary[]>;

  // ── Distributed locks ──────────────────────────────────────────────────
  /** Try to acquire a session-level PG advisory lock. Returns false if already held. */
  tryAcquireAdvanceLock(gameId: string): Promise<boolean>;
  /** Release the session-level advisory lock acquired by tryAcquireAdvanceLock. */
  releaseAdvanceLock(gameId: string): Promise<void>;
}

export class GameStateService implements IGameStateService {

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async gameExists(gameId: string): Promise<boolean> {
    try {
      const rows = await db.select({ id: games.id }).from(games).where(eq(games.id, gameId)).limit(1);
      return rows.length > 0;
    } catch (err) {
      logger.error(`gameExists(${gameId}):`, err);
      return false;
    }
  }

  async createGame(gameId: string): Promise<void> {
    await db.insert(games).values({ id: gameId }).onConflictDoNothing();
  }

  async deleteGame(gameId: string): Promise<void> {
    // CASCADE on FK handles all child rows (players, categories, questions, history)
    await db.delete(games).where(eq(games.id, gameId));
  }

  // ── Meta ───────────────────────────────────────────────────────────────

  async getGameMeta(gameId: string): Promise<GameMetaHash | null> {
    const rows = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (rows.length === 0) return null;
    const g = rows[0];
    return {
      phase: g.phase,
      waitingForPlayers: g.waiting_for_players,
      gameCompleted: g.game_completed,
      current_q_cat: g.current_q_cat,
      current_q_content: g.current_q_content,
      timeout_start: g.timeout_start,
    };
  }

  async setGameMeta(gameId: string, fields: GameMetaHash): Promise<void> {
    const update: Partial<typeof games.$inferInsert> = {};
    if (fields.phase !== undefined)              update.phase = fields.phase;
    if (fields.waitingForPlayers !== undefined)  update.waiting_for_players = fields.waitingForPlayers;
    if (fields.gameCompleted !== undefined)      update.game_completed = fields.gameCompleted;
    if (fields.current_q_cat !== undefined)      update.current_q_cat = fields.current_q_cat;
    if (fields.current_q_content !== undefined)  update.current_q_content = fields.current_q_content;
    if (fields.timeout_start !== undefined)      update.timeout_start = fields.timeout_start;
    if (Object.keys(update).length === 0) return;
    await db.update(games).set(update).where(eq(games.id, gameId));
  }

  // ── Players ────────────────────────────────────────────────────────────

  async addPlayer(gameId: string, player: NHIEPlayer, userId?: string): Promise<void> {
    await db.insert(gamePlayers).values({
      game_id: gameId,
      player_id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      round_vote: player.this_round.vote ?? null,
      round_voted: player.this_round.voted,
      user_id: userId ?? null,
    }).onConflictDoUpdate({
      target: [gamePlayers.game_id, gamePlayers.player_id],
      set: {
        name: player.name,
        score: player.score,
        connected: player.connected,
        round_vote: player.this_round.vote ?? null,
        round_voted: player.this_round.voted,
        // Only set user_id if we have one (don't overwrite an existing link with null)
        ...(userId ? { user_id: userId } : {}),
      },
    });
  }

  async getPlayer(gameId: string, playerId: string): Promise<NHIEPlayer | null> {
    const rows = await db.select().from(gamePlayers)
      .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)))
      .limit(1);
    if (rows.length === 0) return null;
    return this.rowToPlayer(rows[0]);
  }

  async getPlayers(gameId: string): Promise<NHIEPlayer[]> {
    const rows = await db.select().from(gamePlayers).where(eq(gamePlayers.game_id, gameId));
    return rows.map(r => this.rowToPlayer(r));
  }

  async updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void> {
    await db.update(gamePlayers)
      .set({ connected })
      .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)));
  }

  async updatePlayerVote(gameId: string, playerId: string, vote: string, voted: boolean): Promise<void> {
    await db.update(gamePlayers)
      .set({ round_vote: vote, round_voted: voted })
      .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)));
  }

  async incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void> {
    await db.update(gamePlayers)
      .set({ score: sql`${gamePlayers.score} + ${delta}` })
      .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)));
  }

  async resetAllPlayerVotes(gameId: string): Promise<void> {
    await db.update(gamePlayers)
      .set({ round_vote: null, round_voted: false })
      .where(eq(gamePlayers.game_id, gameId));
  }

  async recordVote(gameId: string, playerId: string, voteLabel: string, scoreDelta: number, undoDelta: number): Promise<{ player: NHIEPlayer; allVoted: boolean }> {
    return await db.transaction(async (tx) => {
      // Undo previous score and apply new score + record vote atomically
      const netDelta = scoreDelta + undoDelta;
      if (netDelta !== 0) {
        await tx.update(gamePlayers)
          .set({ score: sql`${gamePlayers.score} + ${netDelta}` })
          .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)));
      }
      await tx.update(gamePlayers)
        .set({ round_vote: voteLabel, round_voted: true })
        .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.player_id, playerId)));

      // Read back updated player and check all-voted in same transaction
      const rows = await tx.select().from(gamePlayers).where(eq(gamePlayers.game_id, gameId));
      const updatedRow = rows.find(r => r.player_id === playerId);
      if (!updatedRow) throw new Error("Player not found after vote update");
      const player = this.rowToPlayer(updatedRow);
      const connected = rows.filter(r => r.connected);
      const allVoted = connected.length > 0 && connected.every(r => r.round_voted);
      return { player, allVoted };
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────

  async getSelectedCategories(gameId: string): Promise<string[]> {
    const rows = await db.select({ category: gameSelectedCategories.category })
      .from(gameSelectedCategories)
      .where(eq(gameSelectedCategories.game_id, gameId));
    return rows.map(r => r.category);
  }

  async addCategory(gameId: string, cat: string): Promise<void> {
    await db.insert(gameSelectedCategories)
      .values({ game_id: gameId, category: cat })
      .onConflictDoNothing();
  }

  async removeCategory(gameId: string, cat: string): Promise<void> {
    await db.delete(gameSelectedCategories)
      .where(and(eq(gameSelectedCategories.game_id, gameId), eq(gameSelectedCategories.category, cat)));
  }

  // ── Questions ──────────────────────────────────────────────────────────

  async initCategoryQuestions(gameId: string, cat: string, questions: string[]): Promise<void> {
    if (questions.length === 0) return;
    // Delete any existing questions for this game/category first (re-init case)
    await db.delete(gameQuestions)
      .where(and(eq(gameQuestions.game_id, gameId), eq(gameQuestions.category, cat)));
    await db.insert(gameQuestions).values(
      questions.map(q => ({ game_id: gameId, category: cat, question: q }))
    );
  }

  async popRandomQuestion(gameId: string, cat: string): Promise<string | null> {
    // Atomically delete and return one random question row
    const rows = await db.execute(sql`
      DELETE FROM game_questions
      WHERE id = (
        SELECT id FROM game_questions
        WHERE game_id = ${gameId} AND category = ${cat}
        ORDER BY random()
        LIMIT 1
      )
      RETURNING question
    `);
    const result = rows as unknown as Array<{ question: string }>;
    return result[0]?.question ?? null;
  }

  async remainingQuestionCount(gameId: string, cat: string): Promise<number> {
    const rows = await db.select({ count: sql<number>`count(*)` })
      .from(gameQuestions)
      .where(and(eq(gameQuestions.game_id, gameId), eq(gameQuestions.category, cat)));
    return Number(rows[0]?.count ?? 0);
  }

  // ── History ────────────────────────────────────────────────────────────

  async pushHistory(gameId: string, entry: GameHistoryEntry): Promise<void> {
    // Single atomic INSERT — position = MAX(existing) + 1, or 0 if first entry
    await db.execute(sql`
      INSERT INTO game_history (game_id, position, entry)
      SELECT ${gameId}, COALESCE(MAX(position) + 1, 0), ${JSON.stringify(entry)}::jsonb
      FROM game_history
      WHERE game_id = ${gameId}
    `);
  }

  async getHistory(gameId: string): Promise<GameHistoryEntry[]> {
    const rows = await db.select({ entry: gameHistory.entry })
      .from(gameHistory)
      .where(eq(gameHistory.game_id, gameId))
      .orderBy(gameHistory.position);
    return rows.map(r => r.entry as GameHistoryEntry);
  }

  // ── Full state ─────────────────────────────────────────────────────────

  async getFullGameState(gameId: string): Promise<NHIEGameState | null> {
    const rows = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (rows.length === 0) return null;
    const g = rows[0];

    const [players, catagories, history] = await Promise.all([
      this.getPlayers(gameId),
      this.getSelectedCategories(gameId),
      this.getHistory(gameId),
    ]);

    return {
      id: gameId,
      gameType: "never-have-i-ever",
      phase: (g.phase as NHIEGameState["phase"]) ?? "category_select",
      players,
      catagories,
      current_question: {
        catagory: g.current_q_cat,
        content: g.current_q_content,
      },
      history,
      waitingForPlayers: g.waiting_for_players,
      gameCompleted: g.game_completed,
      timeout_start: 0,   // populated by engine from in-memory wsService state
      timeout_duration: 0,
    };
  }

  async listActiveGames(): Promise<ActiveGameSummary[]> {
    const [gameRows, playerRows] = await Promise.all([
      db.select({
        id: games.id,
        phase: games.phase,
        waitingForPlayers: games.waiting_for_players,
        gameCompleted: games.game_completed,
        createdAt: games.created_at,
      }).from(games).orderBy(desc(games.created_at)),
      db.select({
        gameId: gamePlayers.game_id,
        playerId: gamePlayers.player_id,
        name: gamePlayers.name,
        connected: gamePlayers.connected,
      }).from(gamePlayers),
    ]);

    const playersByGame = new Map<string, ActiveGamePlayerSummary[]>();
    for (const row of playerRows) {
      const players = playersByGame.get(row.gameId) ?? [];
      players.push({
        id: row.playerId,
        name: row.name,
        connected: row.connected,
      });
      playersByGame.set(row.gameId, players);
    }

    return gameRows.flatMap((game) => {
      const players = (playersByGame.get(game.id) ?? []).sort((left, right) => {
        if (left.connected !== right.connected) {
          return left.connected ? -1 : 1;
        }

        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      });
      const connectedPlayerCount = players.filter((player) => player.connected).length;

      if (connectedPlayerCount === 0) {
        return [];
      }

      const primaryPlayerName = players[0]?.name.trim() || "Untitled";
      const title = primaryPlayerName.endsWith("s")
        ? `${primaryPlayerName}' game`
        : `${primaryPlayerName}'s game`;

      return [{
        id: game.id,
        gameType: "never-have-i-ever" as const,
        title,
        primaryPlayerName,
        phase: game.phase,
        status: game.gameCompleted ? "completed" : game.waitingForPlayers ? "waiting" : "in-progress",
        playerCount: players.length,
        connectedPlayerCount,
        players,
        createdAt: new Date(game.createdAt).toISOString(),
        href: `/play/${game.id}/never-have-i-ever`,
      }];
    });
  }

  // ── Distributed locks ──────────────────────────────────────────────────

  /**
   * pg_try_advisory_lock(classid, objid) — session-level, non-blocking.
   * classid=42 is our app-specific namespace to avoid collisions.
   * objid = abs(hashtext(gameId)) maps the game ID to a stable int4.
   */
  async tryAcquireAdvanceLock(gameId: string): Promise<boolean> {
    const rows = await db.execute<{ pg_try_advisory_lock: boolean }>(sql`
      SELECT pg_try_advisory_lock(42, abs(hashtext(${gameId})))
    `);
    return rows[0]?.pg_try_advisory_lock === true;
  }

  async releaseAdvanceLock(gameId: string): Promise<void> {
    await db.execute(sql`
      SELECT pg_advisory_unlock(42, abs(hashtext(${gameId})))
    `);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private rowToPlayer(row: typeof gamePlayers.$inferSelect): NHIEPlayer {
    return {
      id: row.player_id,
      name: row.name,
      score: row.score,
      connected: row.connected,
      this_round: {
        vote: row.round_vote ?? null,
        voted: row.round_voted,
      },
    };
  }
}
