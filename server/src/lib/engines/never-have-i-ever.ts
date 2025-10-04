import type { GameEngine } from "../../types";
import type { GameSocket } from "../router";
import { config } from "../../config";
import { select_question } from "../questions";
import { deepCopy, sanitizeGameState, requirePlayer } from "../../utils";
import { IWebSocketService } from "../../services/websocket-service";
import { IHttpService } from "../../services/http-service";
import { IPersistenceService } from "../../services/persistence-service";
import type { IGameStateService } from "../../services/game-state-service";
import type { NHIEGameState, NHIEPlayer } from "../../types";
import { ingestEvent } from "../../axiom";
import { ValidationError } from "../../errors";

// Helper function to shuffle array (if needed for future features)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Factory to create the Never Have I Ever engine.
 *
 * Notes on architecture:
 * - This engine maintains its own in-memory game state per `gameId`.
 * - Broadcasting is handled via the WebSocket service provided by dependency injection
 * - Clients are subscribed to the `gameId` topic on join so that publishes
 *   reach all players in the same game. We also send the message directly to
 *   the initiating client via `sendToClient` for immediate feedback.
 */
export function createNeverHaveIEverEngine(
  webSocketService: IWebSocketService,
  httpService: IHttpService,
  persistenceService: IPersistenceService,
  gameStateService: IGameStateService
): GameEngine {
  async function getGame(gameId: string): Promise<NHIEGameState | null> {
    const game = await gameStateService.getGame(gameId);
    return game && 'catagories' in game ? game as NHIEGameState : null;
  }

  async function createNHIEGame(gameId: string): Promise<NHIEGameState> {
    const questionsList = await httpService.getQuestionsList();

    const game: NHIEGameState = {
      id: gameId,
      gameType: 'never-have-i-ever' as const,
      players: [],
      phase: 'category_select',
      current_question: { catagory: "", content: "" },
      catagories: [],
      data: deepCopy(questionsList),
      history: [],
      waitingForPlayers: false,
      gameCompleted: false,
    };
    await gameStateService.setGame(gameId, game);
    return game;
  }

  /**
   * Broadcast a message to all players in a game by publishing to the
   * `gameId` topic and also directly sending to the invoking client.
   */
  function broadcastToGame(ws: GameSocket, op: string, data: any, toClient: boolean = false): void {
    try {
      webSocketService.broadcastToGameAndClient(ws, op, data);
    } catch (error) {
      console.error("Error broadcasting to game:", error);
    }
  }

  async function handleDisconnect(ws: GameSocket): Promise<void> {
    const game = await getGame(ws.data.game);
    if (!game) return;

    const player = game.players.find(p => p.id === ws.data.player);
    if (player) {
      player.connected = false;
      console.log(`Player ${player.name} (${player.id}) disconnected from NHIE game ${ws.data.game}`);

      await gameStateService.setGame(ws.data.game, game);
      // Broadcast updated game state
      const gameState = sanitizeNHIEGameState(game);
      broadcastToGame(ws, "game_state", { game: gameState });
    }
  }

  function sanitizeNHIEGameState(game: NHIEGameState): any {
    // Similar to sanitizeGameState but for NHIE structure
    const sanitized = deepCopy(game);

    // Remove sensitive data if needed
    // For now, return as-is since NHIE doesn't have sensitive data like CAH cards

    return sanitized;
  }

  function allPlayersVoted(game: NHIEGameState): boolean {
    const connectedPlayers = game.players.filter(p => p.connected);
    return connectedPlayers.every(player => player.this_round.voted);
  }

  function proceedToNextRound(ws: GameSocket, game: NHIEGameState): void {
    // Clear the timeout since all players voted
    if (game.round_timeout) {
      clearTimeout(game.round_timeout);
      game.round_timeout = undefined;
    }
    webSocketService.deleteTimeoutStart(game.id);

    // Reset waiting state
    game.waitingForPlayers = false;

    ingestEvent({
      gameID: game.id,
      event: "round_completed",
      details: { all_players_voted: true },
    });

    // Proceed to next question
    handleNextQuestion(ws, {});
  }

  function skipCurrentRound(ws: GameSocket, game: NHIEGameState): void {
    // Clear the timeout since manually skipped
    if (game.round_timeout) {
      clearTimeout(game.round_timeout);
      game.round_timeout = undefined;
    }
    webSocketService.deleteTimeoutStart(game.id);

    // Reset waiting state
    game.waitingForPlayers = false;

    ingestEvent({
      gameID: game.id,
      event: "round_skipped",
      playerID: ws.data.player,
      details: { manual_skip: true },
    });

    // Proceed to next question
    handleNextQuestion(ws, {});
  }

  async function handleNextQuestion(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      // Allow manual skip if in waiting state - only if all players have voted
      if (game.waitingForPlayers) {
        const connectedPlayers = game.players.filter(p => p.connected);
        const votedPlayers = connectedPlayers.filter(p => p.this_round.voted);

        if (votedPlayers.length === connectedPlayers.length) {
          skipCurrentRound(ws, game);
        } else {
          webSocketService.sendToClient(ws, "error", {
            message: `Cannot skip - waiting for all players to vote (${votedPlayers.length}/${connectedPlayers.length})`
          });
        }
        return;
      }

      // Clear any existing timeout
      if (game.round_timeout) {
        clearTimeout(game.round_timeout);
        game.round_timeout = undefined;
      }
      webSocketService.deleteTimeoutStart(ws.data.game);

      // Add current round to history if there's an active question
      if (game.history && game.current_question.catagory !== "") {
        game.history.push({
          question: game.current_question,
          players: deepCopy(game.players),
        });
      }

      // Select new question
      game.current_question = select_question(game);

      // Reset player votes for new round
      game.players.forEach(player => {
        player.this_round = { vote: null, voted: false };
      });

      // Set waiting state
      game.waitingForPlayers = true;
      game.phase = 'waiting';

      ingestEvent({
        gameID: ws.data.game,
        event: "next_question",
        playerID: ws.data.player,
        details: { question: game.current_question },
      });

      const gameState = game.gameCompleted
        ? deepCopy({ ...game, history: game.history })
        : sanitizeNHIEGameState(game);

      // Include timeout info for waiting state
      const gameStateWithTimeout = game.waitingForPlayers
        ? {
          ...gameState,
          timeout_start: webSocketService.getTimeoutStart(ws.data.game) || 0,
          timeout_duration: webSocketService.getRoundTimeoutMs()
        }
        : gameState;

      console.log('[DEBUG] Sending game state:', {
        waitingForPlayers: game.waitingForPlayers,
        timeout_start: (gameStateWithTimeout as any).timeout_start,
        timeout_duration: (gameStateWithTimeout as any).timeout_duration
      });

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game: gameStateWithTimeout }, true);
      broadcastToGame(ws, "new_round", {});
    } catch (error) {
      console.error("Error in handleNextQuestion:", error);
      webSocketService.sendToClient(ws, "error", { message: "Failed to get next question" });
    }
  }

  const handlers: Record<string, (ws: GameSocket, data: any) => Promise<void>> = {
    join_game: async (ws, data) => {
      const { create, playername } = data;
      let game = await getGame(ws.data.game);

      console.log(`Player ${playername} (${ws.data.player}) joined NHIE game ${ws.data.game}`);

      if (!game) {
        if (!create) {
          throw new Error("Game not found");
        }
        game = await createNHIEGame(ws.data.game);
      }

      // Check if player already exists
      let player = game.players.find(p => p.id === ws.data.player);

      if (!player) {
        player = {
          id: ws.data.player,
          name: playername,
          score: 0,
          connected: true,
          this_round: { vote: null, voted: false },
        };
        game.players.push(player);
      } else {
        // Treat repeat joins idempotently without special reconnect handling
        player.connected = true;
      }

      // Subscribe this client to the game topic and notifications channel
      try {
        ws.subscribe(ws.data.game);
        ws.subscribe("notifications");
      } catch (_) {
        // Ignore subscribe errors in tests or environments without a bus
      }

      ingestEvent({
        gameID: ws.data.game,
        event: "player_joined",
        playerID: ws.data.player,
        details: { name: playername },
      });

      // Store WebSocket instance for broadcasting
      webSocketService.addWebSocket(ws.data.game, ws);

      await gameStateService.setGame(ws.data.game, game);
      const gameState = sanitizeNHIEGameState(game);
      broadcastToGame(ws, "game_state", {
        id: ws.data.game,
        game: gameState,
      }, true);
    },

    select_categories: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }
      game.phase = 'category_select';

      ingestEvent({
        gameID: ws.data.game,
        event: "category_selection_started",
        playerID: ws.data.player,
      });

      await gameStateService.setGame(ws.data.game, game);
      await gameStateService.setGame(ws.data.game, game);
      const gameState = sanitizeNHIEGameState(game);
      broadcastToGame(ws, "game_state", { game: gameState }, true);
    },

    select_category: async (ws, data) => {
      if (!data.catagory) {
        throw new ValidationError("Category is required");
      }

      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      const categoryIndex = game.catagories.indexOf(data.catagory);

      if (categoryIndex === -1) {
        game.catagories.push(data.catagory);
      } else {
        game.catagories.splice(categoryIndex, 1);
      }

      ingestEvent({
        gameID: ws.data.game,
        event: "category_selected",
        playerID: ws.data.player,
        details: { catagory: data.catagory },
      });

      await gameStateService.setGame(ws.data.game, game);
      const gameState = sanitizeNHIEGameState(game);
      broadcastToGame(ws, "game_state", { game: gameState }, true);
    },

    confirm_selections: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      if (game.catagories.length === 0) {
        throw new ValidationError("At least one category must be selected");
      }

      game.phase = 'waiting';

      ingestEvent({
        gameID: ws.data.game,
        event: "category_selection_completed",
        playerID: ws.data.player,
        details: { selected_categories: game.catagories },
      });

      await gameStateService.setGame(ws.data.game, game);
      broadcastToGame(ws, "game_state", { game }, true);
    },

    next_question: async (ws, data) => {
      await handleNextQuestion(ws, data);
    },

    vote: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      if (!data.option || data.option < 1 || data.option > 3) {
        throw new ValidationError("Invalid vote option");
      }

      const player = game.players.find(p => p.id === ws.data.player);
      if (!player) {
        throw new Error("Player not found");
      }

      // Handle vote changes (undo previous vote)
      if (player.this_round.voted) {
        // Undo previous vote
        switch (player.this_round.vote) {
          case "Have":
            player.score -= 1;
            break;
          case "Have Not":
            break;
          case "Kinda":
            player.score -= 0.5;
            break;
        }
        player.this_round.voted = false;
      }

      // Apply new vote
      switch (data.option) {
        case 1: // Have
          player.score += 1;
          player.this_round = { vote: "Have", voted: true };
          break;
        case 2: // Have Not
          player.this_round = { vote: "Have Not", voted: true };
          break;
        case 3: // Kinda
          player.score += 0.5;
          player.this_round = { vote: "Kinda", voted: true };
          break;
      }

      ingestEvent({
        gameID: ws.data.game,
        event: "vote_cast",
        playerID: ws.data.player,
        details: { vote: data.option, vote_str: player.this_round.vote },
      });

      broadcastToGame(ws, "vote_cast", { player, vote: player.this_round.vote });

      // Start timeout on first vote if not already started
      if (game.waitingForPlayers && !game.round_timeout) {
        console.log('[DEBUG] Starting timeout on first vote');
        const timeoutStart = Date.now();
        webSocketService.setTimeoutStart(ws.data.game, timeoutStart);

        game.round_timeout = setTimeout(async () => {
          await handleRoundTimeout(ws.data.game, ws);
        }, webSocketService.getRoundTimeoutMs());

        // Send updated game state with timeout info
        const gameState = sanitizeNHIEGameState(game);
        const gameStateWithTimeout = {
          ...gameState,
          timeout_start: timeoutStart,
          timeout_duration: webSocketService.getRoundTimeoutMs()
        };
        await gameStateService.setGame(ws.data.game, game);
        console.log('[DEBUG] Sending timeout start game state:', {
          timeout_start: timeoutStart,
          timeout_duration: webSocketService.getRoundTimeoutMs()
        });
        broadcastToGame(ws, "game_state", { game: gameStateWithTimeout }, true);
      } else {
        console.log('[DEBUG] Vote cast, no timeout start needed');
        await gameStateService.setGame(ws.data.game, game);
        const gameState = sanitizeNHIEGameState(game);
        broadcastToGame(ws, "game_state", { game: gameState }, true);
      }
    },

    reset_game: async (ws, data) => {
      const game = await getGame(ws.data.game);
      if (!game) {
        throw new Error("Game not found");
      }

      const questionsList = await httpService.getQuestionsList();

      // Clear any existing timeout
      if (game.round_timeout) {
        clearTimeout(game.round_timeout);
        game.round_timeout = undefined;
      }
      webSocketService.deleteTimeoutStart(ws.data.game);

      // Reset game state
      game.catagories = [];
      game.history = [];
      game.phase = 'category_select';
      game.gameCompleted = false;
      game.waitingForPlayers = false;
      game.current_question = { catagory: "", content: "" };
      game.data = deepCopy(questionsList);

      // Reset all players
      game.players.forEach(player => {
        player.score = 0;
        player.this_round = { vote: null, voted: false };
      });

      ingestEvent({
        gameID: ws.data.game,
        event: "game_reset",
        playerID: ws.data.player,
        details: { final_state: game },
      });

      const gameState = sanitizeNHIEGameState(game);
      broadcastToGame(ws, "game_state", { game: gameState }, true);
    },

    ping: async (ws, data) => {
      // Simple ping handler
      webSocketService.sendToClient(ws, "pong", {});
    },

    reconnect_status: async (ws, data) => {
      // Server no longer performs reconnect attempts; always report not reconnecting
      webSocketService.sendToClient(ws, "reconnect_status", {
        reconnecting: false,
        attemptCount: 0,
        nextAttemptIn: 0,
      });
    },

    disconnect: async (ws, data) => {
      await handleDisconnect(ws);
    },
  };

  async function handleRoundTimeout(gameId: string, ws: GameSocket): Promise<void> {
    console.log('[DEBUG] Round timeout triggered for game:', gameId);
    const game = await getGame(gameId);
    if (!game || !game.waitingForPlayers) {
      console.log('[DEBUG] Timeout cancelled - game not in waiting state');
      return;
    }

    // Clear the timeout
    game.round_timeout = undefined;
    webSocketService.deleteTimeoutStart(gameId);

    // Reset waiting state
    game.waitingForPlayers = false;

    console.log('[DEBUG] Round timeout processed, proceeding to next question');
    ingestEvent({
      gameID: gameId,
      event: "round_timeout",
      details: {
        connected_players: game.players.filter(p => p.connected).length,
        voted_players: game.players.filter(p => p.connected && p.this_round.voted).length
      },
    });

    // Send timeout notification to all clients
    broadcastToGame(ws, "round_timeout", {
      message: "Round timed out - proceeding to next question"
    });

    // Proceed to next question
    await handleNextQuestion(ws, {});
  }

  return {
    type: "never-have-i-ever",
    handlers,
  };
}