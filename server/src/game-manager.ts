import { GameData, Player, Catagories, CatagoriesSchema } from "./types";
import { config } from "./config";
import { client } from "./redis_client";
import { select_question } from "./lib/questions";
import { GameSocket } from "./lib/router";
import Database from "bun:sqlite";

import { ingestEvent } from "./axiom";
import { GameNotFoundError, GameFullError, ValidationError } from "./errors";
import { deepCopy, sanitizeGameState, requirePlayer } from "./utils";
import { ValkeyJSON } from "./utils/json";
import { PushEvent } from "@octokit/webhooks-types";
import logger from "./logger";

export class GameManager {
  private games: Map<string, GameData> = new Map();
  private readonly ROUND_TIMEOUT_MS = 10000; // 10 seconds

  // Track timeout start times for sync across clients
  private timeoutStarts: Map<string, number> = new Map();

  // Store WebSocket instances for broadcasting
  private gameWebSockets: Map<string, Set<GameSocket>> = new Map();

  // Track if a deployment is in progress
  private deploymentInProgress = false;

  // NHIE-specific socket helpers to avoid cross-engine coupling
  private sendToClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    try {
      const data = JSON.stringify({ ...data_raw, op });
      ws.send(data);
    } catch (err) {
      try {
        ws.send(JSON.stringify({ err, message: "Error sending message", op: "error" }));
      } catch (_) {
        // ignore
      }
    }
  }

  private broadcastToGameAndClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    this.sendToClient(ws, op, data_raw);
    this.broadcastToGame(ws.data.game, op, data_raw)
  }

  private publishToGame(ws: GameSocket, op: string, data_raw: object = {}): void {
    try {
      const data = JSON.stringify({ ...data_raw, op });
      ws.publish(ws.data.game, data);
    } catch (err) {
      this.sendToClient(ws, "error", { message: "Error publishing message", err });
    }
  }

  async getOrCreateGame(gameId: string): Promise<GameData> {
    let game = this.games.get(gameId);

    if (!game) {
      // Try to load from filesystem
      game = await this.loadGame(gameId);

      if (!game) {
        // Create new game
        game = await this.createGame(gameId);
      }

      this.games.set(gameId, game);
    }

    return game;
  }

  private async loadGame(gameId: string): Promise<GameData | null> {
    const filePath = `${config.GAME_DATA_DIR}${gameId}.json`;

    try {
      const gameFile = Bun.file(filePath);
      if (await gameFile.exists()) {
        const gameData = await gameFile.json() as GameData;
        return gameData;
      }
    } catch (error) {
      logger.error(`Error loading game ${gameId}:`, error);
    }

    return null;
  }

  private async createGame(gameId: string): Promise<GameData> {
    const questionsList = await this.getQuestionsList();

    const game: GameData = {
      id: gameId,
      players: [],
      catagories: [],
      catagory_select: true,
      game_completed: false,
      waiting_for_players: false,
      current_question: { catagory: "", content: "" },
      history: [],
      data: deepCopy(questionsList),
    };

    ingestEvent({
      gameID: gameId,
      event: "game_created",
      loaded_from_filesystem: false,
    });

    return game;
  }

  private getGame(gameId: string): GameData | undefined {
    return this.games.get(gameId);
  }

  private async getQuestionsList(): Promise<Catagories> {
    // First check Valkey cache
    let questionsList = await ValkeyJSON.get(client, "shared:questions_list", CatagoriesSchema);

    if (!questionsList) {
      // Load from database if not in cache (categories are in main assets directory)
      const dbPath = `${import.meta.dir}/../assets/db.sqlite`;
      const db = new Database(dbPath);

      try {
        const categoryRows = db.prepare("SELECT name, questions, is_nsfw FROM categories").all() as Array<{
          name: string;
          questions: string;
          is_nsfw: number;
        }>;

        const categoriesData: Catagories = {};

        for (const row of categoryRows) {
          categoriesData[row.name] = {
            flags: {
              is_nsfw: Boolean(row.is_nsfw)
            },
            questions: JSON.parse(row.questions)
          };
        }

        // Cache in Valkey for performance
        await ValkeyJSON.set(client, "shared:questions_list", categoriesData, CatagoriesSchema);
        questionsList = categoriesData;

        logger.info(`Loaded ${Object.keys(categoriesData).length} categories from database`);
      } catch (error) {
        logger.error("Failed to load categories from database:", error);
        // Fallback to empty object if database fails
        questionsList = {};
      } finally {
        db.close();
      }
    }

    return questionsList as Catagories;
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
      this.timeoutStarts.delete(ws.data.game);

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
          timeout_start: this.timeoutStarts.get(ws.data.game) || 0,
          timeout_duration: this.ROUND_TIMEOUT_MS
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
    this.timeoutStarts.delete(gameId);

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
        timeout_start: this.timeoutStarts.get(gameId) || 0,
        timeout_duration: this.ROUND_TIMEOUT_MS
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
      const questionsList = await this.getQuestionsList();

      // Clear any existing timeout
      if (game.round_timeout) {
        clearTimeout(game.round_timeout);
        game.round_timeout = undefined;
      }
      this.timeoutStarts.delete(ws.data.game);

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
        this.timeoutStarts.set(ws.data.game, timeoutStart);

        game.round_timeout = setTimeout(async () => {
          await this.handleRoundTimeout(ws.data.game, ws);
        }, this.ROUND_TIMEOUT_MS);

        // Send updated game state with timeout info
        const gameState = sanitizeGameState(game);
        const gameStateWithTimeout = {
          ...gameState,
          timeout_start: timeoutStart,
          timeout_duration: this.ROUND_TIMEOUT_MS
        };
        console.log('[DEBUG] Sending timeout start game state:', {
          timeout_start: timeoutStart,
          timeout_duration: this.ROUND_TIMEOUT_MS
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
    this.timeoutStarts.delete(game.id);

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
    this.timeoutStarts.delete(game.id);

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
    this.timeoutStarts.delete(gameId);

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
    try {
      const categories = await this.getQuestionsList();
      const response = Response.json(categories);
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Cache-Control", "max-age=86400");
      return response;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      });
    }
  }

  async handleCAHPacks(): Promise<Response> {
    try {
      const dbPath = `${config.GAME_DATA_DIR}db.sqlite`;
      const db = new Database(dbPath);

      // Query to get pack information with card counts
      const packsQuery = `
        SELECT
          pack_name,
          card_type,
          COUNT(*) as card_count
        FROM cah_cards
        GROUP BY pack_name, card_type
        ORDER BY pack_name, card_type
      `;

      const packRows = db.prepare(packsQuery).all() as Array<{
        pack_name: string;
        card_type: string;
        card_count: number;
      }>;

      // Group by pack_name and create pack objects
      const packsMap = new Map<string, {
        id: string;
        name: string;
        blackCards: number;
        whiteCards: number;
        isOfficial: boolean;
        isNSFW: boolean;
      }>();

      for (const row of packRows) {
        const pack = packsMap.get(row.pack_name) || {
          id: row.pack_name,
          name: row.pack_name,
          blackCards: 0,
          whiteCards: 0,
          isOfficial: this.isOfficialPack(row.pack_name),
          isNSFW: this.isNSFWPack(row.pack_name),
        };

        if (row.card_type === 'black') {
          pack.blackCards = row.card_count;
        } else if (row.card_type === 'white') {
          pack.whiteCards = row.card_count;
        }

        packsMap.set(row.pack_name, pack);
      }

      const packs = Array.from(packsMap.values());

      const response = Response.json(packs);
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Cache-Control", "max-age=3600"); // Cache for 1 hour
      db.close();
      return response;
    } catch (error) {
      console.error("Error fetching CAH packs:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      });
    }
  }

  private isOfficialPack(packName: string): boolean {
    // Official packs are those from Cards Against Humanity LLC
    const officialPacks = [
      'CAH Base Set',
      'CAH: First Expansion',
      'CAH: Second Expansion',
      'CAH: Third Expansion',
      'CAH: Fourth Expansion',
      'CAH: Fifth Expansion',
      'CAH: Sixth Expansion',
      'CAH Base Set',
      'CAH: Box Expansion',
      'CAH: Red Box Expansion',
      'CAH: Blue Box Expansion',
      'CAH: Green Box Expansion',
      'CAH: Main Deck',
      'CAH: College Pack',
      'CAH: 2000s Nostalgia Pack',
      'CAH: A.I. Pack',
      'CAH: Ass Pack',
      'CAH: Human Pack',
      'CAH: Procedurally-Generated Cards',
      'CAH: Canadian Conversion Kit',
      'CAH: UK Conversion Kit',
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'CAH: Hidden Gems Bundle: A Few New Cards We Crammed Into This Bundle Pack (Amazon Exclusive)',
    ];
    return officialPacks.some(official => packName.startsWith(official.split(':')[0]));
  }

  private isNSFWPack(packName: string): boolean {
    // Most CAH packs are NSFW, but some are marked as family-friendly
    const cleanPacks = [
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'Kids Against Maturity',
      'Kids Create Absurdity',
      'KinderPerfect',
      'KinderPerfect: A Timeout For Parents (Kickstarter Set)',
      'KinderPerfect: More Expansion Pack',
      'KinderPerfect: Naughty Expansion Pack',
      'KinderPerfect: Tween Expansion Pack',
    ];
    return !cleanPacks.some(clean => packName.includes(clean));
  }

  async handleGame(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const gameId = url.searchParams.get("id");

      if (!gameId) {
        return new Response(JSON.stringify({ error: "no_gameid" }), {
          status: 400,
        });
      }

      const game = this.games.get(gameId);
      if (!game) {
        return new Response(JSON.stringify({ error: "game_not_found" }), {
          status: 404,
        });
      }

      const gameState = {
        ...sanitizeGameState(game),
        active: game.players.filter((p) => p.connected).length > 0,
      };

      return new Response(JSON.stringify(gameState), { status: 200 });
    } catch (error) {
      console.error("Error fetching game:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      });
    }
  }

  async handleGithubWebhook(request: Request, server: any): Promise<Response> {
    try {
      const body = (await request.json()) as PushEvent;

      if (body.ref !== "refs/heads/master") {
        return new Response("Not main branch, ignoring", { status: 200 });
      }

      // Auto-deploy the server
      logger.info("Starting automatic deployment...");
      try {
        const { spawn } = await import("child_process");
        const { resolve } = await import("path");
        const projectRoot = '/opt/never-have-i-ever-server/';
        const scriptPath = resolve(projectRoot, "deploy-server.sh");

        logger.info(`Running deployment script at: ${scriptPath}`);
        logger.info(`Working directory: ${projectRoot}`);

        const deployProcess = spawn(scriptPath, [], {
          cwd: projectRoot,
          stdio: "inherit",
          shell: true,
          env: { ...process.env, USER: process.env.USER || "nginx" }
        });

        deployProcess.on("close", (code) => {
          if (code === 0) {
            logger.info("Deployment completed successfully");
          } else {
            logger.error(`Deployment failed with exit code ${code}`);
          }
        });

        deployProcess.on("error", (error) => {
          logger.error("Failed to start deployment:", error);
        });

      } catch (deployError) {
        logger.error("Error initiating deployment:", deployError);
      }

      // Set deployment flag and notify users about the automatic deployment
      this.deploymentInProgress = true;
      server.publish(
        "notifications",
        JSON.stringify({
          delay: 5000,
          notification: "🚀 Auto-deploying latest version... Server will restart automatically!",
          op: "github_push",
        })
      );

      return new Response("Auto-deployment initiated", { status: 200 });
    } catch (error) {
      logger.error("Error handling GitHub webhook:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Game saving
  async saveActiveGames(): Promise<void> {
    for (const [gameId, game] of this.games) {
      const activePlayers = game.players.filter(p => p.connected).length;
      if (activePlayers === 0) continue;

      try {
        await this.saveGame(game);
        ingestEvent({
          event: "game_state_saved",
          gameID: gameId,
        });
      } catch (error) {
        logger.error(`Error saving game ${gameId}:`, error);
      }
    }
  }

  private async saveGame(game: GameData): Promise<void> {
    const filename = `${game.id}.json`;
    const filePath = `${config.GAME_DATA_DIR}${filename}`;

    try {
      const currentFile = Bun.file(filePath);
      if (await currentFile.exists()) {
        const currentGame = await currentFile.text();
        if (currentGame === JSON.stringify(game)) {
          return; // No changes
        }
      }

      await Bun.write(filePath, JSON.stringify(game));
    } catch (error) {
      throw error;
    }
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
