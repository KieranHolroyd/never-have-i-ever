import { db } from "../db";
import { cahGames, cahGamePlayers, cahSubmissions } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import logger from "../logger";
import type { ActiveGamePlayerSummary, ActiveGameSummary } from "../types";

// Deterministic Fisher-Yates shuffle seeded by a number.
// Same seed → same order on every call (stable within a round).
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed | 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    s = (s ^ (s >>> 14)) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Shared card types (mirror what the client expects) ────────────────────────

export type CAHBlackCard = {
  id: string;
  text: string;
  pick: number;
};

export type CAHWhiteCard = {
  id: string;
  text: string;
};

export type CAHSubmission = {
  playerId: string;
  cards: CAHWhiteCard[];
  playerName: string;
};

export type CAHPlayer = {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  hand: CAHWhiteCard[];
  isJudge: boolean;
};

export type CAHGameState = {
  id: string;
  players: CAHPlayer[];
  selectedPacks: string[];
  passwordProtected?: boolean;
  phase: "waiting" | "selecting" | "judging" | "scoring" | "game_over";
  currentJudge: string | null;
  currentBlackCard: CAHBlackCard | null;
  submittedCards: CAHSubmission[];
  roundWinner: string | null;
  deck: { blackCards: CAHBlackCard[]; whiteCards: CAHWhiteCard[] };
  handSize: number;
  maxRounds: number;
  currentRound: number;
  waitingForPlayers: boolean;
  gameCompleted: boolean;
};

export type CAHGameMeta = {
  phase: string;
  passwordHash: string | null;
  currentJudge: string | null;
  currentBlackCard: CAHBlackCard | null;
  currentRound: number;
  selectedPacks: string[];
  roundWinner: string | null;
  maxRounds: number;
  handSize: number;
  gameCompleted: boolean;
  blackDeck: CAHBlackCard[];
  whiteDeck: CAHWhiteCard[];
};

export interface ICAHGameStateService {
  gameExists(gameId: string): Promise<boolean>;
  createGame(gameId: string): Promise<void>;
  deleteGame(gameId: string): Promise<void>;

  getGameMeta(gameId: string): Promise<CAHGameMeta | null>;
  setGameMeta(gameId: string, fields: Partial<CAHGameMeta>): Promise<void>;

  addPlayer(gameId: string, player: CAHPlayer, userId?: string): Promise<void>;
  getPlayer(gameId: string, playerId: string): Promise<CAHPlayer | null>;
  getPlayers(gameId: string): Promise<CAHPlayer[]>;
  updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void>;
  updatePlayerHand(gameId: string, playerId: string, hand: CAHWhiteCard[]): Promise<void>;
  setPlayerIsJudge(gameId: string, playerId: string, isJudge: boolean): Promise<void>;
  resetAllJudges(gameId: string): Promise<void>;
  incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void>;

  addSubmission(gameId: string, sub: CAHSubmission, round: number): Promise<void>;
  getSubmissions(gameId: string): Promise<CAHSubmission[]>;
  clearSubmissions(gameId: string): Promise<void>;

  /** Returns full game state; `hand` is only populated for `requestingPlayerId` — all others get `hand: []`. */
  getFullGameState(gameId: string, requestingPlayerId: string): Promise<CAHGameState | null>;
  listActiveGames(): Promise<ActiveGameSummary[]>;
}

export class CAHGameStateService implements ICAHGameStateService {

  async gameExists(gameId: string): Promise<boolean> {
    try {
      const rows = await db.select({ id: cahGames.id }).from(cahGames).where(eq(cahGames.id, gameId)).limit(1);
      return rows.length > 0;
    } catch (err) {
      logger.error(`CAH gameExists(${gameId}):`, err);
      return false;
    }
  }

  async createGame(gameId: string): Promise<void> {
    await db.insert(cahGames).values({ id: gameId }).onConflictDoNothing();
  }

  async deleteGame(gameId: string): Promise<void> {
    await db.delete(cahGames).where(eq(cahGames.id, gameId));
  }

  async getGameMeta(gameId: string): Promise<CAHGameMeta | null> {
    const rows = await db.select().from(cahGames).where(eq(cahGames.id, gameId)).limit(1);
    if (rows.length === 0) return null;
    const g = rows[0];
    return {
      phase: g.phase,
      passwordHash: g.password_hash ?? null,
      currentJudge: g.current_judge ?? null,
      currentBlackCard: (g.current_black_card as CAHBlackCard | null) ?? null,
      currentRound: g.current_round,
      selectedPacks: (g.selected_packs as string[]) ?? [],
      roundWinner: g.round_winner ?? null,
      maxRounds: g.max_rounds,
      handSize: g.hand_size,
      gameCompleted: g.game_completed,
      blackDeck: (g.black_deck as CAHBlackCard[]) ?? [],
      whiteDeck: (g.white_deck as CAHWhiteCard[]) ?? [],
    };
  }

  async setGameMeta(gameId: string, fields: Partial<CAHGameMeta>): Promise<void> {
    const update: Partial<typeof cahGames.$inferInsert> = {};
    if (fields.phase !== undefined)             update.phase = fields.phase;
    if (fields.passwordHash !== undefined)      update.password_hash = fields.passwordHash;
    if (fields.currentJudge !== undefined)      update.current_judge = fields.currentJudge;
    if (fields.currentBlackCard !== undefined)  update.current_black_card = fields.currentBlackCard as any;
    if (fields.currentRound !== undefined)      update.current_round = fields.currentRound;
    if (fields.selectedPacks !== undefined)     update.selected_packs = fields.selectedPacks as any;
    if (fields.roundWinner !== undefined)       update.round_winner = fields.roundWinner;
    if (fields.maxRounds !== undefined)         update.max_rounds = fields.maxRounds;
    if (fields.handSize !== undefined)          update.hand_size = fields.handSize;
    if (fields.gameCompleted !== undefined)     update.game_completed = fields.gameCompleted;
    if (fields.blackDeck !== undefined)         update.black_deck = fields.blackDeck as any;
    if (fields.whiteDeck !== undefined)         update.white_deck = fields.whiteDeck as any;
    if (Object.keys(update).length === 0) return;
    await db.update(cahGames).set(update).where(eq(cahGames.id, gameId));
  }

  async addPlayer(gameId: string, player: CAHPlayer, userId?: string): Promise<void> {
    await db.insert(cahGamePlayers).values({
      game_id: gameId,
      player_id: player.id,
      name: player.name,
      score: player.score,
      connected: player.connected,
      hand: player.hand as any,
      is_judge: player.isJudge,
      user_id: userId ?? null,
    }).onConflictDoUpdate({
      target: [cahGamePlayers.game_id, cahGamePlayers.player_id],
      set: {
        name: player.name,
        connected: player.connected,
        // Only set user_id if we have one (don't overwrite an existing link with null)
        ...(userId ? { user_id: userId } : {}),
      },
    });
  }

  async getPlayer(gameId: string, playerId: string): Promise<CAHPlayer | null> {
    const rows = await db.select().from(cahGamePlayers)
      .where(and(eq(cahGamePlayers.game_id, gameId), eq(cahGamePlayers.player_id, playerId)))
      .limit(1);
    if (rows.length === 0) return null;
    return this.rowToPlayer(rows[0]);
  }

  async getPlayers(gameId: string): Promise<CAHPlayer[]> {
    const rows = await db.select().from(cahGamePlayers).where(eq(cahGamePlayers.game_id, gameId));
    return rows.map(r => this.rowToPlayer(r));
  }

  async updatePlayerConnected(gameId: string, playerId: string, connected: boolean): Promise<void> {
    await db.update(cahGamePlayers)
      .set({ connected })
      .where(and(eq(cahGamePlayers.game_id, gameId), eq(cahGamePlayers.player_id, playerId)));
  }

  async updatePlayerHand(gameId: string, playerId: string, hand: CAHWhiteCard[]): Promise<void> {
    await db.update(cahGamePlayers)
      .set({ hand: hand as any })
      .where(and(eq(cahGamePlayers.game_id, gameId), eq(cahGamePlayers.player_id, playerId)));
  }

  async setPlayerIsJudge(gameId: string, playerId: string, isJudge: boolean): Promise<void> {
    await db.update(cahGamePlayers)
      .set({ is_judge: isJudge })
      .where(and(eq(cahGamePlayers.game_id, gameId), eq(cahGamePlayers.player_id, playerId)));
  }

  async resetAllJudges(gameId: string): Promise<void> {
    await db.update(cahGamePlayers)
      .set({ is_judge: false })
      .where(eq(cahGamePlayers.game_id, gameId));
  }

  async incrPlayerScore(gameId: string, playerId: string, delta: number): Promise<void> {
    const player = await this.getPlayer(gameId, playerId);
    if (!player) return;
    await db.update(cahGamePlayers)
      .set({ score: player.score + delta })
      .where(and(eq(cahGamePlayers.game_id, gameId), eq(cahGamePlayers.player_id, playerId)));
  }

  async addSubmission(gameId: string, sub: CAHSubmission, round: number): Promise<void> {
    // Delete any existing submission from this player in this game before inserting
    await db.delete(cahSubmissions)
      .where(and(eq(cahSubmissions.game_id, gameId), eq(cahSubmissions.player_id, sub.playerId)));
    await db.insert(cahSubmissions).values({
      game_id: gameId,
      player_id: sub.playerId,
      player_name: sub.playerName,
      cards: sub.cards as any,
      round,
    });
  }

  async getSubmissions(gameId: string): Promise<CAHSubmission[]> {
    const rows = await db.select().from(cahSubmissions).where(eq(cahSubmissions.game_id, gameId));
    return rows.map(r => ({
      playerId: r.player_id,
      playerName: r.player_name,
      cards: r.cards as CAHWhiteCard[],
    }));
  }

  async clearSubmissions(gameId: string): Promise<void> {
    await db.delete(cahSubmissions).where(eq(cahSubmissions.game_id, gameId));
  }

  async getFullGameState(gameId: string, requestingPlayerId: string): Promise<CAHGameState | null> {
    const meta = await this.getGameMeta(gameId);
    if (!meta) return null;

    const [allPlayers, rawSubmissions] = await Promise.all([
      this.getPlayers(gameId),
      this.getSubmissions(gameId),
    ]);

    // Only send the requesting player their own hand; all others get an empty hand
    const players = allPlayers.map(p => ({
      ...p,
      hand: p.id === requestingPlayerId ? p.hand : [],
    }));

    // Hide player names and shuffle submission order during selecting/judging phases.
    // This prevents players from knowing who submitted what until the round is over.
    let submissions: CAHSubmission[];
    if (meta.phase === "selecting" || meta.phase === "judging") {
      submissions = seededShuffle(rawSubmissions, meta.currentRound).map(s => ({
        ...s,
        playerName: "",
      }));
    } else {
      submissions = rawSubmissions;
    }

    const connectedCount = allPlayers.filter(p => p.connected).length;

    return {
      id: gameId,
      players,
      selectedPacks: meta.selectedPacks,
      passwordProtected: Boolean(meta.passwordHash),
      phase: meta.phase as CAHGameState["phase"],
      currentJudge: meta.currentJudge,
      currentBlackCard: meta.currentBlackCard,
      submittedCards: submissions,
      roundWinner: meta.roundWinner,
      // Do NOT expose raw deck to clients
      deck: { blackCards: [], whiteCards: [] },
      handSize: meta.handSize,
      maxRounds: meta.maxRounds,
      currentRound: meta.currentRound,
      waitingForPlayers: connectedCount < 3,
      gameCompleted: meta.gameCompleted,
    };
  }

  async listActiveGames(): Promise<ActiveGameSummary[]> {
    const [gameRows, playerRows] = await Promise.all([
      db.select({
        id: cahGames.id,
        phase: cahGames.phase,
        gameCompleted: cahGames.game_completed,
        passwordHash: cahGames.password_hash,
        createdAt: cahGames.created_at,
      }).from(cahGames).orderBy(desc(cahGames.created_at)),
      db.select({
        gameId: cahGamePlayers.game_id,
        playerId: cahGamePlayers.player_id,
        name: cahGamePlayers.name,
        connected: cahGamePlayers.connected,
      }).from(cahGamePlayers),
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
        gameType: "cards-against-humanity" as const,
        title,
        primaryPlayerName,
        passwordProtected: Boolean(game.passwordHash),
        phase: game.phase,
        status: game.gameCompleted ? "completed" : connectedPlayerCount < 3 ? "waiting" : "in-progress",
        playerCount: players.length,
        connectedPlayerCount,
        players,
        createdAt: new Date(game.createdAt).toISOString(),
        href: `/play/${game.id}/cards-against-humanity`,
      }];
    });
  }

  private rowToPlayer(row: typeof cahGamePlayers.$inferSelect): CAHPlayer {
    return {
      id: row.player_id,
      name: row.name,
      score: row.score,
      connected: row.connected,
      hand: (row.hand as CAHWhiteCard[]) ?? [],
      isJudge: row.is_judge,
    };
  }
}
