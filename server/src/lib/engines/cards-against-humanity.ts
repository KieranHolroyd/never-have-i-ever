import { db } from "../../db";
import { cahCards } from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import type { IWebSocketService } from "../../services/websocket-service";
import type { IHttpService } from "../../services/http-service";
import type { IGameStateService } from "../../services/game-state-service";
import type { ICAHGameStateService, CAHBlackCard, CAHWhiteCard, CAHPlayer } from "../../services/cah-game-state-service";
import { ingestEvent } from "../../axiom";
import logger from "../../logger";

// ── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createCardsAgainstHumanityEngine(
  wsService: IWebSocketService,
  _httpService: IHttpService,
  _gameStateService: IGameStateService,
  cahService: ICAHGameStateService,
): GameEngine {

  // In-memory scoring display timers (not persisted — short-lived)
  const scoringTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ── Broadcast ──────────────────────────────────────────────────────────

  async function broadcastAll(gameId: string): Promise<void> {
    const sockets = wsService.getGameSockets(gameId);
    await Promise.all(
      Array.from(sockets).map(async (ws) => {
        const state = await cahService.getFullGameState(gameId, ws.data.player);
        if (!state) return;
        try {
          ws.send(JSON.stringify({ op: "game_state", game: state }));
        } catch (_) {}
      })
    );
  }

  // ── Deck management ────────────────────────────────────────────────────

  async function drawWhiteCards(gameId: string, count: number): Promise<CAHWhiteCard[]> {
    const meta = await cahService.getGameMeta(gameId);
    if (!meta || meta.whiteDeck.length === 0) return [];
    const drawn = meta.whiteDeck.splice(0, Math.min(count, meta.whiteDeck.length));
    await cahService.setGameMeta(gameId, { whiteDeck: meta.whiteDeck });
    return drawn;
  }

  async function drawBlackCard(gameId: string): Promise<CAHBlackCard | null> {
    const meta = await cahService.getGameMeta(gameId);
    if (!meta || meta.blackDeck.length === 0) return null;
    const [card, ...remaining] = meta.blackDeck;
    await cahService.setGameMeta(gameId, { blackDeck: remaining, currentBlackCard: card });
    return card;
  }

  // ── Round lifecycle ────────────────────────────────────────────────────

  async function replenishHands(gameId: string): Promise<void> {
    const [players, meta] = await Promise.all([
      cahService.getPlayers(gameId),
      cahService.getGameMeta(gameId),
    ]);
    if (!meta) return;
    const handSize = meta.handSize;

    for (const player of players) {
      if (!player.connected) continue;
      const needed = handSize - player.hand.length;
      if (needed <= 0) continue;
      const newCards = await drawWhiteCards(gameId, needed);
      await cahService.updatePlayerHand(gameId, player.id, [...player.hand, ...newCards]);
    }
  }

  async function rotateJudge(gameId: string): Promise<string | null> {
    const [players, meta] = await Promise.all([
      cahService.getPlayers(gameId),
      cahService.getGameMeta(gameId),
    ]);
    if (!meta) return null;

    const connected = players.filter(p => p.connected);
    if (connected.length === 0) return null;

    let nextJudge: CAHPlayer;
    if (!meta.currentJudge) {
      nextJudge = connected[0];
    } else {
      const idx = connected.findIndex(p => p.id === meta.currentJudge);
      nextJudge = connected[(idx + 1) % connected.length];
    }

    await cahService.resetAllJudges(gameId);
    await cahService.setPlayerIsJudge(gameId, nextJudge.id, true);
    return nextJudge.id;
  }

  async function startFirstRound(gameId: string): Promise<void> {
    const judgeId = await rotateJudge(gameId);
    await replenishHands(gameId);
    const blackCard = await drawBlackCard(gameId);

    await cahService.setGameMeta(gameId, {
      currentRound: 1,
      currentJudge: judgeId,
      phase: "selecting",
      roundWinner: null,
    });

    ingestEvent({ gameID: gameId, event: "cah_round_started", details: { round: 1 } });
  }

  async function maybeStartGame(gameId: string): Promise<boolean> {
    const [meta, players] = await Promise.all([
      cahService.getGameMeta(gameId),
      cahService.getPlayers(gameId),
    ]);
    if (!meta) return false;
    if (meta.phase !== "waiting") return false;
    if ((meta.selectedPacks?.length ?? 0) === 0) return false;

    const connected = players.filter(p => p.connected);
    if (connected.length < 3) return false;

    await startFirstRound(gameId);
    return true;
  }

  async function advanceRound(gameId: string): Promise<void> {
    // Clear any scoring timer if still pending
    const t = scoringTimers.get(gameId);
    if (t !== undefined) {
      clearTimeout(t);
      scoringTimers.delete(gameId);
    }

    const meta = await cahService.getGameMeta(gameId);
    if (!meta) return;

    const nextRound = meta.currentRound + 1;

    // Check end conditions
    if (nextRound > meta.maxRounds || meta.blackDeck.length === 0) {
      await cahService.setGameMeta(gameId, {
        phase: "game_over",
        gameCompleted: true,
      });
      ingestEvent({ gameID: gameId, event: "cah_game_over" });
      await broadcastAll(gameId);
      return;
    }

    // Rotate judge & draw black card
    const judgeId = await rotateJudge(gameId);
    const blackCard = await drawBlackCard(gameId);

    // Clear old submissions, replenish hands
    await cahService.clearSubmissions(gameId);
    await replenishHands(gameId);

    await cahService.setGameMeta(gameId, {
      currentRound: nextRound,
      currentJudge: judgeId,
      currentBlackCard: blackCard,
      phase: "selecting",
      roundWinner: null,
    });

    ingestEvent({ gameID: gameId, event: "cah_round_started", details: { round: nextRound } });
    await broadcastAll(gameId);
  }

  // ── Handlers ───────────────────────────────────────────────────────────

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {

    join_game: async (ws, data) => {
      const { playername } = data;
      const gameId = ws.data.game;

      const exists = await cahService.gameExists(gameId);
      if (!exists) {
        await cahService.createGame(gameId);
      }

      const existing = await cahService.getPlayer(gameId, ws.data.player);
      if (!existing) {
        const player: CAHPlayer = {
          id: ws.data.player,
          name: playername,
          score: 0,
          connected: true,
          hand: [],
          isJudge: false,
        };
        await cahService.addPlayer(gameId, player);
      } else {
        const nextName = typeof playername === "string" && playername.trim().length > 0
          ? playername.trim()
          : existing.name;

        await cahService.addPlayer(gameId, {
          ...existing,
          name: nextName,
          connected: true,
        });

        // Refill reconnecting players back to the configured hand size when
        // they missed draws while disconnected.
        const meta = await cahService.getGameMeta(gameId);
        if (meta && meta.selectedPacks.length > 0 && meta.phase !== "waiting") {
          const needed = meta.handSize - existing.hand.length;
          if (needed > 0) {
            const cards = await drawWhiteCards(gameId, needed);
            if (cards.length > 0) {
              await cahService.updatePlayerHand(gameId, ws.data.player, [...existing.hand, ...cards]);
            }
          }
        }
      }

      try {
        ws.subscribe(gameId);
        ws.subscribe("notifications");
      } catch (_) {}

      wsService.addWebSocket(gameId, ws);
      ingestEvent({ gameID: gameId, event: "cah_player_joined", playerID: ws.data.player, details: { name: playername } });

      const started = await maybeStartGame(gameId);
      if (!started) {
        await broadcastAll(gameId);
      } else {
        await broadcastAll(gameId);
      }
    },

    select_packs: async (ws, data) => {
      const { packIds } = data;
      const gameId = ws.data.game;

      if (!Array.isArray(packIds) || packIds.length === 0) {
        wsService.sendToClient(ws, "error", { message: "packIds must be a non-empty array" });
        return;
      }

      const meta = await cahService.getGameMeta(gameId);
      if (!meta) {
        wsService.sendToClient(ws, "error", { message: "Game not found" });
        return;
      }

      // Load cards from DB
      const rows = await db.select().from(cahCards).where(inArray(cahCards.pack_name, packIds));

      const blackCards: CAHBlackCard[] = [];
      const whiteCards: CAHWhiteCard[] = [];

      for (const row of rows) {
        if (row.card_type === "black") {
          blackCards.push({ id: String(row.id), text: row.text, pick: row.pick ?? 1 });
        } else {
          whiteCards.push({ id: String(row.id), text: row.text });
        }
      }

      if (blackCards.length === 0 || whiteCards.length === 0) {
        wsService.sendToClient(ws, "error", { message: "Selected packs have no cards" });
        return;
      }

      const shuffledBlack = shuffle(blackCards);
      const shuffledWhite = shuffle(whiteCards);

      await cahService.setGameMeta(gameId, {
        selectedPacks: packIds,
        blackDeck: shuffledBlack,
        whiteDeck: shuffledWhite,
        phase: "waiting",
      });

      // Deal hands to all currently connected players
      const players = await cahService.getPlayers(gameId);
      for (const player of players) {
        if (!player.connected) continue;
        const cards = await drawWhiteCards(gameId, meta.handSize);
        await cahService.updatePlayerHand(gameId, player.id, cards);
      }

      ingestEvent({ gameID: gameId, event: "cah_packs_selected", details: { packs: packIds } });

      const started = await maybeStartGame(gameId);
      if (!started) {
        await broadcastAll(gameId);
      } else {
        await broadcastAll(gameId);
      }
    },

    submit_cards: async (ws, data) => {
      const { cardIds } = data;
      const gameId = ws.data.game;

      const [meta, player] = await Promise.all([
        cahService.getGameMeta(gameId),
        cahService.getPlayer(gameId, ws.data.player),
      ]);

      if (!meta || !player) {
        wsService.sendToClient(ws, "error", { message: "Game or player not found" });
        return;
      }

      if (meta.phase !== "selecting") {
        wsService.sendToClient(ws, "error", { message: "Not in the selecting phase" });
        return;
      }

      if (player.isJudge) {
        wsService.sendToClient(ws, "error", { message: "The judge cannot submit cards" });
        return;
      }

      if (!meta.currentBlackCard) {
        wsService.sendToClient(ws, "error", { message: "No black card for this round" });
        return;
      }

      const required = meta.currentBlackCard.pick;
      if (!Array.isArray(cardIds) || cardIds.length !== required) {
        wsService.sendToClient(ws, "error", { message: `Must submit exactly ${required} card(s)` });
        return;
      }

      // Validate cards are in player's hand
      const handIds = new Set(player.hand.map(c => c.id));
      const validIds = cardIds.filter(id => handIds.has(id));
      if (validIds.length !== required) {
        wsService.sendToClient(ws, "error", { message: "Submitted cards not in your hand" });
        return;
      }

      const submittedCards = player.hand.filter(c => cardIds.includes(c.id));
      const newHand = player.hand.filter(c => !cardIds.includes(c.id));

      await Promise.all([
        cahService.updatePlayerHand(gameId, ws.data.player, newHand),
        cahService.addSubmission(gameId, {
          playerId: ws.data.player,
          playerName: player.name,
          cards: submittedCards,
        }, meta.currentRound),
      ]);

      ingestEvent({ gameID: gameId, event: "cah_cards_submitted", playerID: ws.data.player });

      // Check if all connected non-judges have submitted
      const [players, submissions] = await Promise.all([
        cahService.getPlayers(gameId),
        cahService.getSubmissions(gameId),
      ]);

      const nonJudges = players.filter(p => p.connected && !p.isJudge);
      const submittedPlayerIds = new Set(submissions.map(s => s.playerId));
      const allSubmitted = nonJudges.length > 0 && nonJudges.every(p => submittedPlayerIds.has(p.id));

      if (allSubmitted) {
        await cahService.setGameMeta(gameId, { phase: "judging" });
        ingestEvent({ gameID: gameId, event: "cah_all_submitted" });
      }

      await broadcastAll(gameId);
    },

    select_winner: async (ws, data) => {
      const { winnerPlayerId } = data;
      const gameId = ws.data.game;

      const [meta, judge] = await Promise.all([
        cahService.getGameMeta(gameId),
        cahService.getPlayer(gameId, ws.data.player),
      ]);

      if (!meta || !judge) {
        wsService.sendToClient(ws, "error", { message: "Game or player not found" });
        return;
      }

      if (meta.phase !== "judging") {
        wsService.sendToClient(ws, "error", { message: "Not in the judging phase" });
        return;
      }

      if (!judge.isJudge) {
        wsService.sendToClient(ws, "error", { message: "Only the judge can select a winner" });
        return;
      }

      await Promise.all([
        cahService.incrPlayerScore(gameId, winnerPlayerId, 1),
        cahService.setGameMeta(gameId, { roundWinner: winnerPlayerId, phase: "scoring" }),
      ]);

      ingestEvent({ gameID: gameId, event: "cah_winner_selected", details: { winner: winnerPlayerId } });
      await broadcastAll(gameId);

      // Auto-advance to next round after 5 seconds
      const timer = setTimeout(async () => {
        scoringTimers.delete(gameId);
        try {
          await advanceRound(gameId);
        } catch (err) {
          logger.error(`CAH advanceRound error for ${gameId}:`, err);
        }
      }, 5000);
      scoringTimers.set(gameId, timer);
    },

    reset_game: async (ws, _data) => {
      const gameId = ws.data.game;

      // Cancel any pending scoring timer
      const t = scoringTimers.get(gameId);
      if (t !== undefined) {
        clearTimeout(t);
        scoringTimers.delete(gameId);
      }

      // Remember who's connected so they can rejoin the fresh game
      const oldPlayers = await cahService.getPlayers(gameId).catch(() => [] as CAHPlayer[]);
      const connectedPlayers = oldPlayers.filter(p => p.connected);

      await cahService.deleteGame(gameId);
      await cahService.createGame(gameId);

      // Re-add connected players with wiped state
      for (const p of connectedPlayers) {
        await cahService.addPlayer(gameId, {
          id: p.id,
          name: p.name,
          score: 0,
          connected: true,
          hand: [],
          isJudge: false,
        });
      }

      ingestEvent({ gameID: gameId, event: "cah_game_reset" });
      await broadcastAll(gameId);
    },

    disconnect: async (ws, _data) => {
      const gameId = ws.data.game;
      const disconnectingId = ws.data.player;

      await cahService.updatePlayerConnected(gameId, disconnectingId, false);
      wsService.handleDisconnect(ws);
      ingestEvent({ gameID: gameId, event: "cah_player_disconnected", playerID: disconnectingId });

      const meta = await cahService.getGameMeta(gameId);

      if (meta?.phase === "selecting") {
        // If the disconnecting player was the last non-judge who hadn't submitted,
        // auto-advance to judging now.
        const [players, submissions] = await Promise.all([
          cahService.getPlayers(gameId),
          cahService.getSubmissions(gameId),
        ]);
        const nonJudges = players.filter(p => p.connected && !p.isJudge);
        const submittedIds = new Set(submissions.map(s => s.playerId));
        const allSubmitted = nonJudges.length > 0 && nonJudges.every(p => submittedIds.has(p.id));
        if (allSubmitted) {
          await cahService.setGameMeta(gameId, { phase: "judging" });
          ingestEvent({ gameID: gameId, event: "cah_all_submitted" });
        }
      } else if (meta?.phase === "judging" && meta.currentJudge === disconnectingId) {
        // Judge left mid-round — auto-pick a random winner so the game doesn't freeze.
        const submissions = await cahService.getSubmissions(gameId);
        if (submissions.length > 0) {
          const winner = submissions[Math.floor(Math.random() * submissions.length)];
          await Promise.all([
            cahService.incrPlayerScore(gameId, winner.playerId, 1),
            cahService.setGameMeta(gameId, { roundWinner: winner.playerId, phase: "scoring" }),
          ]);
          ingestEvent({ gameID: gameId, event: "cah_winner_selected", details: { winner: winner.playerId, reason: "judge_disconnected" } });
          const timer = setTimeout(async () => {
            scoringTimers.delete(gameId);
            try { await advanceRound(gameId); } catch (err) {
              logger.error(`CAH advanceRound error for ${gameId}:`, err);
            }
          }, 5000);
          scoringTimers.set(gameId, timer);
        }
      }

      await broadcastAll(gameId);
    },

    ping: async (ws, _data) => {
      await wsService.handlePing(ws);
    },
  };

  return { type: "cards-against-humanity", handlers };
}

