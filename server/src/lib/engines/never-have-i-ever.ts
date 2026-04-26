import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import type { IWebSocketService } from "../../services/websocket-service";
import type { IHttpService } from "../../services/http-service";
import type { IGameStateService } from "../../services/game-state-service";
import type { NHIEPlayer, NHIEGameState } from "@nhie/shared";
import { ingestEvent } from "../../axiom";
import { GameFullError, ValidationError } from "../../errors";
import { hashRoomPassword, normalizeRoomPassword, validateRoomPassword, verifyRoomPassword } from "../../utils/game-password";
import { refreshUserStats } from "../../utils/refresh-user-stats";
import logger from "../../logger";

const VOTE_SCORES: Record<string, number> = {
  Have: 1,
  "Have Not": 0,
  Kinda: 0.5,
};

const VOTE_LABELS: Record<number, string> = {
  1: "Have",
  2: "Have Not",
  3: "Kinda",
};

export function createNeverHaveIEverEngine(
  wsService: IWebSocketService,
  httpService: IHttpService,
  gameStateService: IGameStateService
): GameEngine {
  // ── In-memory timeout handles (not persisted — only this process's timers) ──
  const roundTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  // Track the active timeout duration per game so clients get an accurate countdown
  const roundTimeoutDurations = new Map<string, number>();
  // ── Broadcast helper ────────────────────────────────────────────────────

  async function broadcast(ws: GameSocket): Promise<void> {
    const game = await gameStateService.getFullGameState(ws.data.game);
    if (!game) return;

    const timeoutStart = wsService.getTimeoutStart(ws.data.game) ?? 0;
    const timeoutDuration = roundTimeoutDurations.get(ws.data.game) ?? wsService.getRoundTimeoutMs();
    const payload: NHIEGameState = {
      ...game,
      timeout_start: timeoutStart,
      timeout_duration: timeoutDuration,
    };
    wsService.broadcastToGameAndClient(ws, "game_state", { game: payload });
  }

  // ── Round advancement ───────────────────────────────────────────────────

  async function advanceToNextQuestion(ws: GameSocket): Promise<void> {
    const gameId = ws.data.game;

    // Prevent double-advance race using a PG session-level advisory lock.
    // Works across multiple server processes, unlike an in-memory Set.
    const acquired = await gameStateService.tryAcquireAdvanceLock(gameId);
    if (!acquired) return;

    try {
    // Clear any running timeout
    clearRoundTimeout(gameId);

    // Persist current question to history before selecting the next one
    const currentState = await gameStateService.getFullGameState(gameId);
    if (currentState && currentState.current_question.catagory !== "") {
      await gameStateService.pushHistory(gameId, {
        question: currentState.current_question,
        players: currentState.players,
      });
    }

    // Pick a random question from a random selected category (SPOP)
    const categories = await gameStateService.getSelectedCategories(gameId);
    if (categories.length === 0) {
      await gameStateService.setGameMeta(gameId, {
        gameCompleted: true,
        phase: "game_over",
        waitingForPlayers: false,
      });
      await broadcast(ws);
      refreshUserStats();
      return;
    }

    // Shuffle categories and try each until we find one with questions remaining
    const shuffled = [...categories].sort(() => Math.random() - 0.5);
    let picked: string | null = null;
    let question: string | null = null;

    for (const cat of shuffled) {
      question = await gameStateService.popRandomQuestion(gameId, cat);
      if (question !== null) {
        picked = cat;
        break;
      }
      // Category exhausted — remove it from the selected set
      await gameStateService.removeCategory(gameId, cat);
    }

    if (!picked || question === null) {
      // All questions exhausted
      await gameStateService.setGameMeta(gameId, {
        gameCompleted: true,
        phase: "game_over",
        waitingForPlayers: false,
      });
      await broadcast(ws);
      refreshUserStats();
      return;
    }

    // Reset player votes for the new round
    await gameStateService.resetAllPlayerVotes(gameId);

    await gameStateService.setGameMeta(gameId, {
      phase: "waiting",
      waitingForPlayers: false,
      current_q_cat: picked,
      current_q_content: question,
      timeout_start: 0,
    });

    ingestEvent({ gameID: gameId, event: "next_question", details: { category: picked } });

    wsService.broadcastToGameAndClient(ws, "new_round", {});
    await broadcast(ws);
    } finally {
      await gameStateService.releaseAdvanceLock(gameId);
    }
  }

  // ── Timeout helpers ─────────────────────────────────────────────────────

  function clearRoundTimeout(gameId: string): void {
    const t = roundTimeouts.get(gameId);
    if (t !== undefined) {
      clearTimeout(t);
      roundTimeouts.delete(gameId);
    }
    roundTimeoutDurations.delete(gameId);
    wsService.deleteTimeoutStart(gameId);
  }

  function scheduleTimeout(ws: GameSocket, delayMs: number): void {
    const gameId = ws.data.game;
    const handle = setTimeout(async () => {
      roundTimeouts.delete(gameId);
      logger.info(`Round timeout fired for game ${gameId}`);

      const meta = await gameStateService.getGameMeta(gameId);
      if (!meta || meta.waitingForPlayers !== true) return;

      ingestEvent({ gameID: gameId, event: "round_timeout" });
      wsService.broadcastToGame(gameId, "round_timeout", {
        message: "Round timed out — moving to next question",
      });

      await advanceToNextQuestion(ws);
    }, delayMs);
    roundTimeouts.set(gameId, handle);
  }

  async function startRoundTimeout(ws: GameSocket): Promise<void> {
    const gameId = ws.data.game;
    if (roundTimeouts.has(gameId)) return; // already started

    const timeoutStart = Date.now();
    const duration = wsService.getRoundTimeoutMs();
    wsService.setTimeoutStart(gameId, timeoutStart);
    roundTimeoutDurations.set(gameId, duration);
    await gameStateService.setGameMeta(gameId, { timeout_start: timeoutStart });

    scheduleTimeout(ws, duration);

    // Re-broadcast so clients get the timeout_start timestamp
    await broadcast(ws);
  }

  /**
   * Called on join_game to restore a timer that was lost due to a server restart.
   * Reads the stored timeout_start from Redis and reschedules with remaining time,
   * or advances immediately if the timer has already expired.
   * Returns true if it triggered an immediate advance (caller should skip broadcast).
   */
  async function maybeRestoreTimeout(ws: GameSocket): Promise<boolean> {
    const gameId = ws.data.game;
    if (roundTimeouts.has(gameId)) return false; // timer still running — nothing to restore

    const meta = await gameStateService.getGameMeta(gameId);
    if (!meta || meta.waitingForPlayers !== true) return false;

    const storedStart = meta.timeout_start ?? 0;
    if (storedStart === 0) return false; // timer never started this round

    const remaining = wsService.getRoundTimeoutMs() - (Date.now() - storedStart);
    wsService.setTimeoutStart(gameId, storedStart); // restore in-memory state
    roundTimeoutDurations.set(gameId, wsService.getRoundTimeoutMs());

    if (remaining <= 0) {
      // Timer expired while server was down — advance now
      logger.info(`Restoring expired timeout for game ${gameId}; advancing immediately`);
      await advanceToNextQuestion(ws);
      return true;
    }

    logger.info(`Restoring round timeout for game ${gameId}; ${remaining}ms remaining`);
    scheduleTimeout(ws, remaining);
    return false;
  }

  async function ensureConnectedCreator(gameId: string, preferredPlayerId?: string): Promise<void> {
    const [meta, players] = await Promise.all([
      gameStateService.getGameMeta(gameId),
      gameStateService.getPlayers(gameId),
    ]);

    if (!meta) return;

    const connectedPlayers = players.filter((player) => player.connected);
    if (connectedPlayers.length === 0) return;

    const hasConnectedCreator = meta.creator_player_id
      ? connectedPlayers.some((player) => player.id === meta.creator_player_id)
      : false;

    if (hasConnectedCreator) return;

    const nextCreator = preferredPlayerId && connectedPlayers.some((player) => player.id === preferredPlayerId)
      ? preferredPlayerId
      : connectedPlayers[0].id;

    await gameStateService.setGameMeta(gameId, {
      creator_player_id: nextCreator,
    });

    ingestEvent({
      gameID: gameId,
      event: "creator_transferred",
      playerID: nextCreator,
    });
  }

  function normalizeMaxPlayers(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 2 || value > 20) {
      throw new ValidationError("Room size must be between 2 and 20 players");
    }

    return value;
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    // -----------------------------------------------------------------------
    join_game: async (ws, data) => {
      const { create, playername } = data;
      const gameId = ws.data.game;
      const roomPassword = normalizeRoomPassword(data.password);

      const exists = await gameStateService.gameExists(gameId);
      if (!exists) {
        if (!create) throw new Error("Game not found");
        await gameStateService.createGame(gameId);
        await gameStateService.setGameMeta(gameId, {
          creator_player_id: ws.data.player,
        });

        if (roomPassword) {
          validateRoomPassword(roomPassword);
          await gameStateService.setGameMeta(gameId, {
            password_hash: await hashRoomPassword(roomPassword),
          });
        }
      } else {
        const meta = await gameStateService.getGameMeta(gameId);

        if (meta?.password_hash) {
          if (!roomPassword) {
            throw new ValidationError("This game requires a password");
          }

          const passwordValid = await verifyRoomPassword(roomPassword, meta.password_hash);
          if (!passwordValid) {
            throw new ValidationError("Incorrect game password");
          }
        }
      }

      const existing = await gameStateService.getPlayer(gameId, ws.data.player);
      if (!existing) {
        const [meta, players] = await Promise.all([
          gameStateService.getGameMeta(gameId),
          gameStateService.getPlayers(gameId),
        ]);

        if (players.length >= (meta?.max_players ?? 20)) {
          throw new GameFullError(meta?.max_players ?? 20);
        }

        const player: NHIEPlayer = {
          id: ws.data.player,
          name: playername,
          score: 0,
          connected: true,
          this_round: { vote: null, voted: false },
        };
        await gameStateService.addPlayer(gameId, player, ws.data.userId);
      } else {
        await gameStateService.updatePlayerConnected(gameId, ws.data.player, true);
      }

      await ensureConnectedCreator(gameId, ws.data.player);

      try {
        ws.subscribe(gameId);
        ws.subscribe("notifications");
      } catch (_) { /* no-op in test env */ }

      wsService.addWebSocket(gameId, ws);

      ingestEvent({ gameID: gameId, event: "player_joined", playerID: ws.data.player, details: { name: playername } });

      // Re-arm the round timer if server restarted while a round was in progress
      const advanced = await maybeRestoreTimeout(ws);
      if (!advanced) await broadcast(ws);
    },

    set_room_password: async (ws, data) => {
      const gameId = ws.data.game;
      const meta = await gameStateService.getGameMeta(gameId);

      if (!meta) {
        throw new ValidationError("Game not found");
      }

      if (meta.phase !== "category_select") {
        throw new ValidationError("Room password can only be changed before the game starts");
      }

      if (meta.creator_player_id !== ws.data.player) {
        throw new ValidationError("Only the game creator can change the room password");
      }

      const roomPassword = normalizeRoomPassword(data.password);

      if (roomPassword) {
        validateRoomPassword(roomPassword);
        await gameStateService.setGameMeta(gameId, {
          password_hash: await hashRoomPassword(roomPassword),
        });
      } else {
        await gameStateService.setGameMeta(gameId, { password_hash: null });
      }

      await broadcast(ws);
    },

    set_max_players: async (ws, data) => {
      const gameId = ws.data.game;
      const meta = await gameStateService.getGameMeta(gameId);

      if (!meta) {
        throw new ValidationError("Game not found");
      }

      if (meta.phase !== "category_select") {
        throw new ValidationError("Room size can only be changed before the game starts");
      }

      if (meta.creator_player_id !== ws.data.player) {
        throw new ValidationError("Only the game creator can change the room size");
      }

      const maxPlayers = normalizeMaxPlayers(data.maxPlayers);
      const players = await gameStateService.getPlayers(gameId);
      if (maxPlayers < players.length) {
        throw new ValidationError(`Room size cannot be lower than the current player count (${players.length})`);
      }

      await gameStateService.setGameMeta(gameId, {
        max_players: maxPlayers,
      });

      await broadcast(ws);
    },

    remove_player: async (ws, data) => {
      const gameId = ws.data.game;
      const targetPlayerId = data.playerId;
      const meta = await gameStateService.getGameMeta(gameId);

      if (!meta) {
        throw new ValidationError("Game not found");
      }

      if (meta.phase !== "category_select") {
        throw new ValidationError("Players can only be removed before the game starts");
      }

      if (meta.creator_player_id !== ws.data.player) {
        throw new ValidationError("Only the game creator can remove players");
      }

      if (targetPlayerId === ws.data.player) {
        throw new ValidationError("The game creator cannot remove themselves");
      }

      const targetPlayer = await gameStateService.getPlayer(gameId, targetPlayerId);
      if (!targetPlayer) {
        throw new ValidationError("Player not found");
      }

      await gameStateService.removePlayer(gameId, targetPlayerId);

      for (const socket of wsService.getGameSockets(gameId)) {
        if (socket.data.player !== targetPlayerId) continue;
        wsService.sendToClient(socket, "removed_from_game", {
          message: "You were removed from the room by the creator",
        });
        wsService.removeWebSocket(gameId, socket);
        try {
          socket.close(1000, "removed_from_game");
        } catch (_) {}
      }

      ingestEvent({
        gameID: gameId,
        event: "player_removed",
        playerID: targetPlayerId,
        details: { removedBy: ws.data.player },
      });

      await broadcast(ws);
    },

    // -----------------------------------------------------------------------
    select_categories: async (ws, _data) => {
    await gameStateService.setGameMeta(ws.data.game, { phase: "category_select", waitingForPlayers: false });
      await broadcast(ws);
    },

    // -----------------------------------------------------------------------
    select_category: async (ws, data) => {
      if (!data.catagory) throw new ValidationError("Category is required");
      const gameId = ws.data.game;

      const selected = await gameStateService.getSelectedCategories(gameId);
      if (selected.includes(data.catagory)) {
        await gameStateService.removeCategory(gameId, data.catagory);
      } else {
        await gameStateService.addCategory(gameId, data.catagory);
      }

      ingestEvent({ gameID: gameId, event: "category_toggled", playerID: ws.data.player, details: { catagory: data.catagory } });
      await broadcast(ws);
    },

    // -----------------------------------------------------------------------
    confirm_selections: async (ws, _data) => {
      const gameId = ws.data.game;
      const selected = await gameStateService.getSelectedCategories(gameId);
      if (selected.length === 0) throw new ValidationError("At least one category must be selected");

      // Load the master question list and seed per-category question SETs
      const allQuestions = await httpService.getQuestionsList();
      await Promise.all(
        selected.map(async (cat) => {
          const qs = allQuestions[cat]?.questions ?? [];
          await gameStateService.initCategoryQuestions(gameId, cat, qs);
        })
      );

      ingestEvent({ gameID: gameId, event: "category_selection_completed", playerID: ws.data.player, details: { selected_categories: selected } });

      await advanceToNextQuestion(ws);
    },

    // -----------------------------------------------------------------------
    next_question: async (ws, _data) => {
      const meta = await gameStateService.getGameMeta(ws.data.game);
      if (!meta) throw new Error("Game not found");

      if (meta.waitingForPlayers === true) {
        // Only allow skip if all connected players have voted
        const players = await gameStateService.getPlayers(ws.data.game);
        const connected = players.filter(p => p.connected);
        const voted = connected.filter(p => p.this_round.voted);
        if (voted.length < connected.length) {
          wsService.sendToClient(ws, "error", {
            message: `Cannot skip — waiting for players to vote (${voted.length}/${connected.length})`,
          });
          return;
        }
      }

      await advanceToNextQuestion(ws);
    },

    // -----------------------------------------------------------------------
    vote: async (ws, data) => {
      const gameId = ws.data.game;

      if (!data.option || data.option < 1 || data.option > 3) {
        throw new ValidationError("Invalid vote option");
      }

      const newVoteLabel = VOTE_LABELS[data.option as 1 | 2 | 3];
      const scoreDelta = VOTE_SCORES[newVoteLabel] ?? 0;

      // Read previous vote to calculate undo delta before the transaction
      const prev = await gameStateService.getPlayer(gameId, ws.data.player);
      if (!prev) throw new Error("Player not found");
      const undoDelta = (prev.this_round.voted && prev.this_round.vote)
        ? -(VOTE_SCORES[prev.this_round.vote] ?? 0)
        : 0;

      // Single atomic transaction: undo old score, apply new score, record vote, check all-voted
      const { allVoted } = await gameStateService.recordVote(
        gameId, ws.data.player, newVoteLabel, scoreDelta, undoDelta
      );

      ingestEvent({ gameID: gameId, event: "vote_cast", playerID: ws.data.player, details: { vote: data.option, vote_str: newVoteLabel } });

      // On first vote in the round, lock the round and start the timeout
      const meta = await gameStateService.getGameMeta(gameId);
      if (meta?.waitingForPlayers === false) {
        await gameStateService.setGameMeta(gameId, { waitingForPlayers: true });
      }
      if (!roundTimeouts.has(gameId)) {
        await startRoundTimeout(ws);
      }

      if (allVoted) {
        // Cancel any running timeout (e.g. the 30s skip timer), then give
        // everyone a 10-second results window before advancing.
        clearRoundTimeout(gameId);
        const RESULTS_WINDOW_MS = 10_000;
        const resultsStart = Date.now();
        wsService.setTimeoutStart(gameId, resultsStart);
        roundTimeoutDurations.set(gameId, RESULTS_WINDOW_MS);
        await gameStateService.setGameMeta(gameId, {
          waitingForPlayers: true,
          timeout_start: resultsStart,
        });
        await broadcast(ws); // clients see final votes + 10s countdown
        scheduleTimeout(ws, RESULTS_WINDOW_MS);
        return;
      }

      await broadcast(ws);
    },

    // -----------------------------------------------------------------------
    reset_game: async (ws, _data) => {
      const gameId = ws.data.game;
      clearRoundTimeout(gameId);

      // Capture current players before deleting
      const players = await gameStateService.getPlayers(gameId);
      const meta = await gameStateService.getGameMeta(gameId);

      await gameStateService.deleteGame(gameId);
      await gameStateService.createGame(gameId);
      await gameStateService.setGameMeta(gameId, {
        max_players: meta?.max_players ?? 20,
        creator_player_id: meta?.creator_player_id ?? ws.data.player,
      });

      // Re-add players with zeroed scores
      for (const p of players) {
        await gameStateService.addPlayer(gameId, {
          ...p,
          score: 0,
          connected: p.connected,
          this_round: { vote: null, voted: false },
        });
      }

      ingestEvent({ gameID: gameId, event: "game_reset", playerID: ws.data.player });
      await broadcast(ws);
    },

    // -----------------------------------------------------------------------
    ping: async (ws, _data) => {
      wsService.sendToClient(ws, "pong", {});
    },

    reconnect_status: async (ws, _data) => {
      wsService.sendToClient(ws, "reconnect_status", {
        reconnecting: false,
        attemptCount: 0,
        nextAttemptIn: 0,
      });
    },

    disconnect: async (ws, _data) => {
      const gameId = ws.data.game;
      await gameStateService.updatePlayerConnected(gameId, ws.data.player, false);
      await ensureConnectedCreator(gameId);
      wsService.removeWebSocket(gameId, ws);

      ingestEvent({ gameID: gameId, event: "player_disconnected", playerID: ws.data.player });
      await broadcast(ws);
    },
  };

  return { type: "never-have-i-ever", handlers };
}
