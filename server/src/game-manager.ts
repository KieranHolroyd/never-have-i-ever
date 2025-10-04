import { GameData, Player } from "./types";
import { config } from "./config";
import { select_question } from "./lib/questions";
import { GameSocket } from "./lib/router";

import { ingestEvent } from "./axiom";
import { GameNotFoundError, GameFullError, ValidationError } from "./errors";
import { deepCopy, sanitizeGameState, requirePlayer } from "./utils";
import { IWebSocketService, WebSocketService } from "./services/websocket-service";
import { IHttpService, HttpService } from "./services/http-service";
import { IPersistenceService } from "./services/persistence-service";
import logger from "./logger";

export class GameManager {
  private games: Map<string, GameData> = new Map();

  // Track if a deployment is in progress
  private deploymentInProgress = false;

  // Store WebSocket instances for broadcasting
  private gameWebSockets: Map<string, Set<GameSocket>> = new Map();

  constructor(private webSocketService: IWebSocketService, private httpService: IHttpService, private persistenceService: IPersistenceService) {}

  // NHIE-specific socket helpers to avoid cross-engine coupling
  private sendToClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    this.webSocketService.sendToClient(ws, op, data_raw);
  }

  private broadcastToGameAndClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    this.webSocketService.broadcastToGameAndClient(ws, op, data_raw);
  }

  private publishToGame(ws: GameSocket, op: string, data_raw: object = {}): void {
    this.webSocketService.publishToGame(ws, op, data_raw);
  }
  // NHIE-specific socket helpers to avoid cross-engine coupling

  async getOrCreateGame(gameId: string): Promise<GameData> {
    let game = this.games.get(gameId);

    if (!game) {
      // Try to load from filesystem
      game = await this.persistenceService.loadGame(gameId);

      if (!game) {
        // Create new game
        game = await this.persistenceService.createGame(gameId);
      }

      this.games.set(gameId, game);
    }

    return game;
  }


  private getGame(gameId: string): GameData | undefined {
    return this.games.get(gameId);
  }


  // WebSocket handlers
  async handleJoinGame(ws: GameSocket, data: any): Promise<void> {
    try {
      const { create, playername } = data;

      if (create) {
        await this.getOrCreateGame(ws.data.game);
      }

      const game = await this.getOrCreateGame(ws.data.game);

      if (game.players.length >= 12) {
        this.sendToClient(ws, "error", { message: "Game is full" });
        ws.close(1013, "Game is full");
        return;
      }

      const existingPlayer = game.players.find(p => p.id === ws.data.player);
      if (!existingPlayer) {
        const newPlayer: Player = {
          id: ws.data.player,
          name: playername,
          score: 0,
          connected: true,
          this_round: { vote: null, voted: false },
        };
        game.players.push(newPlayer);
      } else {
        existingPlayer.connected = true;
        ingestEvent({
          gameID: ws.data.game,
          event: "player_reconnected",
          playerID: ws.data.player,
        });
      }

      ingestEvent({
        gameID: ws.data.game,
        event: "player_joined",
        playerID: ws.data.player,
        details: { name: playername },
      });

      // Store WebSocket instance for broadcasting
      if (!this.gameWebSockets.has(ws.data.game)) {
        this.gameWebSockets.set(ws.data.game, new Set());
      }
      this.gameWebSockets.get(ws.data.game)!.add(ws);

      ws.subscribe(ws.data.game);
      ws.subscribe("notifications");

      const gameState = sanitizeGameState(game);
      this.broadcastToGameAndClient(ws, "game_state", {
        id: ws.data.game,
        game: gameState,
      });
    } catch (error) {
      console.error("Error in handleJoinGame:", error);
      this.sendToClient(ws, "error", { message: "Failed to join game" });
    }
  }

  async handleSelectCategories(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await this.getOrCreateGame(ws.data.game);
      game.catagory_select = true;

      ingestEvent({
        gameID: ws.data.game,
        event: "catagory_selection_started",
        playerID: ws.data.player,
      });

      const gameState = sanitizeGameState(game);
      this.broadcastToGameAndClient(ws, "game_state", { game: gameState });
    } catch (error) {
      console.error("Error in handleSelectCategories:", error);
      this.sendToClient(ws, "error", { message: "Failed to start category selection" });
    }
  }

  async handleSelectCategory(ws: GameSocket, data: any): Promise<void> {
    try {
      if (!data.catagory) {
        throw new ValidationError("Category is required");
      }

      const game = await this.getOrCreateGame(ws.data.game);
      const categoryIndex = game.catagories.indexOf(data.catagory);

      if (categoryIndex === -1) {
        game.catagories.push(data.catagory);
      } else {
        game.catagories.splice(categoryIndex, 1);
      }

      ingestEvent({
        gameID: ws.data.game,
        event: "catagory_selected",
        playerID: ws.data.player,
        details: { catagory: data.catagory },
      });

      const gameState = sanitizeGameState(game);
      this.broadcastToGameAndClient(ws, "game_state", { game: gameState });
    } catch (error) {
      if (error instanceof ValidationError) {
        this.sendToClient(ws, "error", { message: error.message });
        return;
      }
      console.error("Error in handleSelectCategory:", error);
      this.sendToClient(ws, "error", { message: "Failed to select category" });
    }
  }

  async handleConfirmSelections(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await this.getOrCreateGame(ws.data.game);

      if (game.catagories.length === 0) {
        throw new ValidationError("At least one category must be selected");
      }

      game.catagory_select = false;

      ingestEvent({
        gameID: ws.data.game,
        event: "catagory_selection_completed",
        playerID: ws.data.player,
        details: { selected_catagories: game.catagories },
      });

      this.broadcastToGameAndClient(ws, "game_state", { game });
    } catch (error) {
      if (error instanceof ValidationError) {
        this.sendToClient(ws, "error", { message: error.message });
        return;
      }
      console.error("Error in handleConfirmSelections:", error);
      this.sendToClient(ws, "error", { message: "Failed to confirm selections" });
    }
  }

  async handleNextQuestion(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await this.getOrCreateGame(ws.data.game);

      // Allow manual skip if in waiting state - only if all players have voted
      if (game.waiting_for_players) {
        const connectedPlayers = game.players.filter(p => p.connected);
        const votedPlayers = connectedPlayers.filter(p => p.this_round.voted);

        if (votedPlayers.length === connectedPlayers.length) {
          this.skipCurrentRound(ws, game);
        } else {
          this.sendToClient(ws, "error", {
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
      this.webSocketService.deleteTimeoutStart(ws.data.game);

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
      game.waiting_for_players = true;

      ingestEvent({
        gameID: ws.data.game,
        event: "next_question",
        playerID: ws.data.player,
        details: { question: game.current_question },
      });

      const gameState = game.game_completed
        ? deepCopy({ ...game, history: game.history })
        : sanitizeGameState(game);

      // Include timeout info for waiting state
      const gameStateWithTimeout = game.waiting_for_players
        ? {
          ...gameState,
          timeout_start: this.webSocketService.getTimeoutStart(ws.data.game) || 0,
          timeout_duration: this.webSocketService.getRoundTimeoutMs()
        }
        : gameState;

      console.log('[DEBUG] Sending game state:', {
        waiting_for_players: game.waiting_for_players,
        timeout_start: (gameStateWithTimeout as any).timeout_start,
        timeout_duration: (gameStateWithTimeout as any).timeout_duration
      });

      this.broadcastToGameAndClient(ws, "game_state", { game: gameStateWithTimeout });
      this.broadcastToGameAndClient(ws, "new_round", {});
    } catch (error) {
      console.error("Error in handleNextQuestion:", error);
      this.sendToClient(ws, "error", { message: "Failed to get next question" });
    }
  }

  private async advanceToNextQuestion(gameId: string, ws: GameSocket): Promise<void> {
    const game = await this.getOrCreateGame(gameId);

    // Clear any existing timeout
    if (game.round_timeout) {
      clearTimeout(game.round_timeout);
      game.round_timeout = undefined;
    }
    this.webSocketService.deleteTimeoutStart(gameId);

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
    game.waiting_for_players = true;

    ingestEvent({
      gameID: gameId,
      event: "next_question",
      playerID: "system",
      details: { question: game.current_question },
    });

    const gameState = game.game_completed
      ? deepCopy({ ...game, history: game.history })
      : sanitizeGameState(game);

    // Include timeout info for waiting state
    const gameStateWithTimeout = game.waiting_for_players
      ? {
        ...gameState,
        timeout_start: this.webSocketService.getTimeoutStart(gameId) || 0,
        timeout_duration: this.webSocketService.getRoundTimeoutMs()
      }
      : gameState;

    console.log('[DEBUG] Broadcasting new game state after timeout:', {
      waiting_for_players: game.waiting_for_players,
      timeout_start: (gameStateWithTimeout as any).timeout_start,
      timeout_duration: (gameStateWithTimeout as any).timeout_duration
    });

    // Broadcast to all players via topic publish using any connected socket
    this.broadcastToGameAndClient(ws, "game_state", { game: gameStateWithTimeout });
    this.broadcastToGameAndClient(ws, "new_round", {});
  }

  private broadcastToGame(gameId: string, op: string, data: any): void {
    const gameSockets = this.gameWebSockets.get(gameId);
    if (!gameSockets || gameSockets.size === 0) {
      console.log('[DEBUG] No WebSocket instances found for game:', gameId);
      return;
    }

    // Publish exactly once via any connected socket to avoid duplicate messages.
    const iterator = gameSockets.values();
    const wsAny = iterator.next().value;
    if (!wsAny) return;

    try {
      const payload = JSON.stringify({ ...data, op });
      wsAny.publish(gameId, payload);
    } catch (error) {
      console.error('[DEBUG] Error broadcasting to game:', error);
    }
  }

  // Topic-based broadcasting is handled by `broadcastToGame`, which selects any
  // connected WebSocket for the game and publishes once to the game topic.

  async handleResetGame(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await this.getOrCreateGame(ws.data.game);
      const questionsList = await this.httpService.getQuestionsList();

      // Clear any existing timeout
      if (game.round_timeout) {
        clearTimeout(game.round_timeout);
        game.round_timeout = undefined;
      }
      this.webSocketService.deleteTimeoutStart(ws.data.game);

      // Reset game state
      game.catagories = [];
      game.history = [];
      game.catagory_select = true;
      game.game_completed = false;
      game.waiting_for_players = false;
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

      const gameState = sanitizeGameState(game);
      this.broadcastToGameAndClient(ws, "game_state", { game: gameState });
    } catch (error) {
      console.error("Error in handleResetGame:", error);
      this.sendToClient(ws, "error", { message: "Failed to reset game" });
    }
  }

  async handleVote(ws: GameSocket, data: any): Promise<void> {
    try {
      const game = await this.getOrCreateGame(ws.data.game);

      if (!data.option || data.option < 1 || data.option > 3) {
        throw new ValidationError("Invalid vote option");
      }

      const player = requirePlayer(game, ws.data.player);

      // Handle vote changes (undo previous vote)
      if (player.this_round.voted) {
        this.undoVote(player);
      }

      // Apply new vote
      this.applyVote(player, data.option);

      ingestEvent({
        gameID: ws.data.game,
        event: "vote_cast",
        playerID: ws.data.player,
        details: { vote: data.option, vote_str: player.this_round.vote },
      });

      this.broadcastToGameAndClient(ws, "vote_cast", { player, vote: player.this_round.vote });

      // Start timeout on first vote if not already started
      if (game.waiting_for_players && !game.round_timeout) {
        console.log('[DEBUG] Starting timeout on first vote');
        const timeoutStart = Date.now();
        this.webSocketService.setTimeoutStart(ws.data.game, timeoutStart);

        game.round_timeout = setTimeout(async () => {
          await this.handleRoundTimeout(ws.data.game, ws);
        }, this.webSocketService.getRoundTimeoutMs());

        // Send updated game state with timeout info
        const gameState = sanitizeGameState(game);
        const gameStateWithTimeout = {
          ...gameState,
          timeout_start: timeoutStart,
          timeout_duration: this.webSocketService.getRoundTimeoutMs()
        };
        console.log('[DEBUG] Sending timeout start game state:', {
          timeout_start: timeoutStart,
          timeout_duration: this.webSocketService.getRoundTimeoutMs()
        });
        this.broadcastToGameAndClient(ws, "game_state", { game: gameStateWithTimeout });
      } else {
        console.log('[DEBUG] Vote cast, no timeout start needed');
        const gameState = sanitizeGameState(game);
        this.broadcastToGameAndClient(ws, "game_state", { game: gameState });
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        this.sendToClient(ws, "error", { message: error.message });
        return;
      }
      console.error("Error in handleVote:", error);
      this.sendToClient(ws, "error", { message: "Failed to cast vote" });
    }
  }

  private undoVote(player: Player): void {
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

  private applyVote(player: Player, option: number): void {
    switch (option) {
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
  }

  async handlePing(ws: GameSocket, data: any): Promise<void> {
    this.sendToClient(ws, "pong");
  }

  private allPlayersVoted(game: GameData): boolean {
    const connectedPlayers = game.players.filter(p => p.connected);
    return connectedPlayers.every(player => player.this_round.voted);
  }

  private proceedToNextRound(ws: GameSocket, game: GameData): void {
    // Clear the timeout since all players voted
    if (game.round_timeout) {
      clearTimeout(game.round_timeout);
      game.round_timeout = undefined;
    }
    this.webSocketService.deleteTimeoutStart(game.id);

    // Reset waiting state
    game.waiting_for_players = false;

    ingestEvent({
      gameID: game.id,
      event: "round_completed",
      details: { all_players_voted: true },
    });

    // Proceed to next question
    this.handleNextQuestion(ws, {});
  }

  private skipCurrentRound(ws: GameSocket, game: GameData): void {
    // Clear the timeout since manually skipped
    if (game.round_timeout) {
      clearTimeout(game.round_timeout);
      game.round_timeout = undefined;
    }
    this.webSocketService.deleteTimeoutStart(game.id);

    // Reset waiting state
    game.waiting_for_players = false;

    ingestEvent({
      gameID: game.id,
      event: "round_skipped",
      playerID: ws.data.player,
      details: { manual_skip: true },
    });

    // Proceed to next question
    this.handleNextQuestion(ws, {});
  }

  private async handleRoundTimeout(gameId: string, ws: GameSocket): Promise<void> {
    console.log('[DEBUG] Round timeout triggered for game:', gameId);
    const game = this.games.get(gameId);
    if (!game || !game.waiting_for_players) {
      console.log('[DEBUG] Timeout cancelled - game not in waiting state');
      return;
    }

    // Clear the timeout
    game.round_timeout = undefined;
    this.webSocketService.deleteTimeoutStart(gameId);

    // Reset waiting state
    game.waiting_for_players = false;

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
    this.broadcastToGameAndClient(ws, "round_timeout", {
      message: "Round timed out - proceeding to next question"
    });

    // Emit timeout event to all players
    console.log('[DEBUG] Attempting to broadcast timeout message');

    // For now, skip the broadcast and just proceed to next question
    // The new game state will be sent by handleNextQuestion

    // Proceed to next question without using a WebSocket
    console.log('[DEBUG] Proceeding to next question after timeout');
    await this.advanceToNextQuestion(gameId, ws);
  }

  handleDisconnect(ws: GameSocket): void {
    try {
      const game = this.games.get(ws.data.game);
      if (!game) return;

      // Remove WebSocket instance
      const gameSockets = this.gameWebSockets.get(ws.data.game);
      if (gameSockets) {
        gameSockets.delete(ws);
        if (gameSockets.size === 0) {
          this.gameWebSockets.delete(ws.data.game);
        }
      }

      const player = game.players.find(p => p.id === ws.data.player);
      if (player) {
        player.connected = false;
        ingestEvent({
          event: "websocket_connection_closed",
          playerID: ws.data.player,
        });
      }

      const gameState = sanitizeGameState(game);
      this.broadcastToGameAndClient(ws, "game_state", { game: gameState });
    } catch (error) {
      console.error("Error in handleDisconnect:", error);
    }
  }

  async handleReconnectStatus(ws: GameSocket, data: any): Promise<void> {
    try {
      // Server no longer performs reconnect attempts; always report not reconnecting
      this.sendToClient(ws, "reconnect_status", {
        reconnecting: false,
        attemptCount: 0,
        nextAttemptIn: 0,
      });
    } catch (error) {
      console.error("Error in handleReconnectStatus:", error);
      this.sendToClient(ws, "error", { message: "Failed to get reconnect status" });
    }
  }

  // HTTP handlers
  async handleCategories(): Promise<Response> {
    return await this.httpService.handleCategories();
  }

  async handleCAHPacks(): Promise<Response> {
    return await this.httpService.handleCAHPacks();
  }


  async handleGame(request: Request): Promise<Response> {
    return await this.httpService.handleGame(this.games, request);
  }

  async handleGithubWebhook(request: Request, server: any): Promise<Response> {
    this.deploymentInProgress = true;
    return await this.httpService.handleGithubWebhook(request, server, this.deploymentInProgress);
  }

  // Game saving
  async saveActiveGames(): Promise<void> {
    await this.persistenceService.saveActiveGames(this.games);
  }


  // Deployment tracking methods
  isDeploymentInProgress(): boolean {
    return this.deploymentInProgress;
  }

  clearDeploymentFlag(): void {
    this.deploymentInProgress = false;
  }

  cleanup(): void {
    logger.info("GameManager cleanup initiated");
    // No reconnect manager to clean up anymore
    logger.info("GameManager cleanup completed");
  }
}
