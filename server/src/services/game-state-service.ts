import { getClient } from "../redis_client";
import logger from "../logger";
import type { NHIEPlayer, NHIEGameState, GameHistoryEntry, Question } from "@nhie/shared";

// ── Redis key helpers ──────────────────────────────────────────────────────
const TTL = 86400; // 24 hours

const k = {
  meta:         (id: string) => `game:${id}`,
  players:      (id: string) => `game:${id}:players`,
  player:       (id: string, pid: string) => `game:${id}:player:${pid}`,
  selectedCats: (id: string) => `game:${id}:categories:selected`,
  questions:    (id: string, cat: string) => `game:${id}:questions:${cat}`,
  history:      (id: string) => `game:${id}:history`,
};

// Subset of the meta HASH that can be set atomically
export type GameMetaHash = {
  phase?: string;
  waitingForPlayers?: "0" | "1" | string;
  gameCompleted?: "0" | "1" | string;
  current_q_cat?: string;
  current_q_content?: string;
  timeout_start?: string;
};

export interface IGameStateService {
  // ── Lifecycle ──────────────────────────────────────────────────────────
  gameExists(gameId: string): Promise<boolean>;
  createGame(gameId: string): Promise<void>;
  deleteGame(gameId: string): Promise<void>;

  // ── Meta ───────────────────────────────────────────────────────────────
  getGameMeta(gameId: string): Promise<(GameMetaHash & { [k: string]: string }) | null>;
  setGameMeta(gameId: string, fields: GameMetaHash): Promise<void>;

  // ── Players ────────────────────────────────────────────────────────────
  addPlayer(gameId: string, player: NHIEPlayer): Promise<void>;
  getPlayer(gameId: string, playerId: string): Promise<NHIEPlayer | null>;
  getPlayers(gameId: string): Promise<NHIEPlayer[]>;
  updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void>;
  updatePlayerVote(gameId: string, playerId: string, vote: string, voted: boolean): Promise<void>;
  incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void>;
  resetAllPlayerVotes(gameId: string): Promise<void>;

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
}

export class GameStateService implements IGameStateService {

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async gameExists(gameId: string): Promise<boolean> {
    try {
      const client = await getClient();
      const result = await client.exists(k.meta(gameId));
      return Number(result) > 0;
    } catch (err) {
      logger.error(`gameExists(${gameId}):`, err);
      return false;
    }
  }

  async createGame(gameId: string): Promise<void> {
    const client = await getClient();
    const metaKey = k.meta(gameId);
    await client.hset(metaKey,
      "phase", "category_select",
      "waitingForPlayers", "0",
      "gameCompleted", "0",
      "current_q_cat", "",
      "current_q_content", "",
      "timeout_start", "0"
    );
    await client.expire(metaKey, TTL);
  }

  async deleteGame(gameId: string): Promise<void> {
    const client = await getClient();
    // Collect all keys for this game and delete them
    const pattern = `game:${gameId}*`;
    const keys: string[] = await client.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await client.del(key);
      }
    }
  }

  // ── Meta ───────────────────────────────────────────────────────────────

  async getGameMeta(gameId: string): Promise<(GameMetaHash & { [k: string]: string }) | null> {
    const client = await getClient();
    const data = await client.hgetall(k.meta(gameId));
    if (!data || Object.keys(data).length === 0) return null;
    return data as Record<string, string>;
  }

  async setGameMeta(gameId: string, fields: GameMetaHash): Promise<void> {
    const client = await getClient();
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) pairs.push(key, value);
    }
    if (pairs.length === 0) return;
    await (client as any).hset(k.meta(gameId), ...pairs);
  }

  // ── Players ────────────────────────────────────────────────────────────

  async addPlayer(gameId: string, player: NHIEPlayer): Promise<void> {
    const client = await getClient();
    const playersKey = k.players(gameId);
    const playerKey = k.player(gameId, player.id);

    await client.sadd(playersKey, player.id);
    await client.expire(playersKey, TTL);

    await client.hset(playerKey,
      "id", player.id,
      "name", player.name,
      "score", String(player.score),
      "connected", player.connected ? "1" : "0",
      "round_vote", player.this_round.vote ?? "",
      "round_voted", player.this_round.voted ? "1" : "0"
    );
    await client.expire(playerKey, TTL);
  }

  async getPlayer(gameId: string, playerId: string): Promise<NHIEPlayer | null> {
    const client = await getClient();
    const data = await client.hgetall(k.player(gameId, playerId));
    if (!data || !data.id) return null;
    return this.deserializePlayer(data);
  }

  async getPlayers(gameId: string): Promise<NHIEPlayer[]> {
    const client = await getClient();
    const playerIds: string[] = await client.smembers(k.players(gameId));
    if (playerIds.length === 0) return [];

    const players = await Promise.all(
      playerIds.map(pid => this.getPlayer(gameId, pid))
    );
    return players.filter((p): p is NHIEPlayer => p !== null);
  }

  async updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void> {
    const client = await getClient();
    await client.hset(k.player(gameId, playerId), "connected", connected ? "1" : "0");
  }

  async updatePlayerVote(gameId: string, playerId: string, vote: string, voted: boolean): Promise<void> {
    const client = await getClient();
    await client.hset(k.player(gameId, playerId),
      "round_vote", vote,
      "round_voted", voted ? "1" : "0"
    );
  }

  async incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void> {
    const client = await getClient();
    await client.hincrbyfloat(k.player(gameId, playerId), "score", delta);
  }

  async resetAllPlayerVotes(gameId: string): Promise<void> {
    const client = await getClient();
    const playerIds: string[] = await client.smembers(k.players(gameId));
    await Promise.all(
      playerIds.map(pid =>
        client.hset(k.player(gameId, pid), "round_vote", "", "round_voted", "0")
      )
    );
  }

  // ── Categories ─────────────────────────────────────────────────────────

  async getSelectedCategories(gameId: string): Promise<string[]> {
    const client = await getClient();
    return client.smembers(k.selectedCats(gameId));
  }

  async addCategory(gameId: string, cat: string): Promise<void> {
    const client = await getClient();
    const key = k.selectedCats(gameId);
    await client.sadd(key, cat);
    await client.expire(key, TTL);
  }

  async removeCategory(gameId: string, cat: string): Promise<void> {
    const client = await getClient();
    await client.srem(k.selectedCats(gameId), cat);
  }

  // ── Questions ──────────────────────────────────────────────────────────

  async initCategoryQuestions(gameId: string, cat: string, questions: string[]): Promise<void> {
    if (questions.length === 0) return;
    const client = await getClient();
    const key = k.questions(gameId, cat);
    await client.sadd(key, ...questions);
    await client.expire(key, TTL);
  }

  async popRandomQuestion(gameId: string, cat: string): Promise<string | null> {
    const client = await getClient();
    const result = await client.spop(k.questions(gameId, cat));
    if (!result) return null;
    // spop may return an array (COUNT variant) or a single string
    if (Array.isArray(result)) return result[0] ?? null;
    return result as string;
  }

  async remainingQuestionCount(gameId: string, cat: string): Promise<number> {
    const client = await getClient();
    return client.scard(k.questions(gameId, cat));
  }

  // ── History ────────────────────────────────────────────────────────────

  async pushHistory(gameId: string, entry: GameHistoryEntry): Promise<void> {
    const client = await getClient();
    const key = k.history(gameId);
    await client.rpush(key, JSON.stringify(entry));
    await client.expire(key, TTL);
  }

  async getHistory(gameId: string): Promise<GameHistoryEntry[]> {
    const client = await getClient();
    const items: string[] = await client.lrange(k.history(gameId), 0, -1);
    return items.map(item => JSON.parse(item) as GameHistoryEntry);
  }

  // ── Full state ─────────────────────────────────────────────────────────

  async getFullGameState(gameId: string): Promise<NHIEGameState | null> {
    const meta = await this.getGameMeta(gameId);
    if (!meta) return null;

    const [players, catagories, history] = await Promise.all([
      this.getPlayers(gameId),
      this.getSelectedCategories(gameId),
      this.getHistory(gameId),
    ]);

    const currentQuestion: Question = {
      catagory: meta.current_q_cat ?? "",
      content: meta.current_q_content ?? "",
    };

    return {
      id: gameId,
      gameType: "never-have-i-ever",
      phase: (meta.phase as NHIEGameState["phase"]) ?? "category_select",
      players,
      catagories,
      current_question: currentQuestion,
      history,
      waitingForPlayers: meta.waitingForPlayers === "1",
      gameCompleted: meta.gameCompleted === "1",
      timeout_start: 0,   // populated by engine from in-memory wsService state
      timeout_duration: 0,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private deserializePlayer(data: Record<string, string>): NHIEPlayer {
    return {
      id: data.id ?? "",
      name: data.name ?? "",
      score: parseFloat(data.score ?? "0"),
      connected: data.connected === "1",
      this_round: {
        vote: data.round_vote && data.round_vote !== "" ? data.round_vote : null,
        voted: data.round_voted === "1",
      },
    };
  }
}
