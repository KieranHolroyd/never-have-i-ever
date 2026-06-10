import { GameData, Player, Catagories } from "../types";
import { select_question } from "./questions";
import { GameSocket } from "./router";
import { sanitizeGameState, deepCopy, requirePlayer } from "../utils";
import { ValidationError } from "../errors";
import { ingestEvent } from "../axiom";
import logger from "../logger";

export class GameStateManager {
  /**
   * Create a new game
   */
  createGame(gameId: string, questionsList: Catagories): GameData {
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

  /**
   * Reset game to initial state
   */
  resetGame(game: GameData, questionsList: Catagories): void {

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
      gameID: game.id,
      event: "game_reset",
      playerID: "system",
      details: { final_state: game },
    });
  }

  /**
   * Add player to game
   */
  addPlayer(game: GameData, playerId: string, playerName: string): Player {
    const existingPlayer = game.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.connected = true;
      ingestEvent({
        gameID: game.id,
        event: "player_reconnected",
        playerID: playerId,
      });
      return existingPlayer;
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      connected: true,
      this_round: { vote: null, voted: false },
    };

    game.players.push(newPlayer);

    ingestEvent({
      gameID: game.id,
      event: "player_joined",
      playerID: playerId,
      details: { name: playerName },
    });

    return newPlayer;
  }

  /**
   * Remove player from game
   */
  removePlayer(game: GameData, playerId: string): void {
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      ingestEvent({
        event: "websocket_connection_closed",
        playerID: playerId,
      });
    }
  }

  /**
   * Handle category selection
   */
  toggleCategory(game: GameData, category: string): void {
    const categoryIndex = game.catagories.indexOf(category);

    if (categoryIndex === -1) {
      game.catagories.push(category);
    } else {
      game.catagories.splice(categoryIndex, 1);
    }
  }

  /**
   * Confirm category selections
   */
  confirmCategories(game: GameData, playerId: string): void {
    if (game.catagories.length === 0) {
      throw new ValidationError("At least one category must be selected");
    }

    game.catagory_select = false;

    ingestEvent({
      gameID: game.id,
      event: "catagory_selection_completed",
      playerID: playerId,
      details: { selected_catagories: game.catagories },
    });
  }

  /**
   * Start next question round
   */
  startNextQuestion(game: GameData, playerId: string): void {

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
      gameID: game.id,
      event: "next_question",
      playerID: playerId,
      details: { question: game.current_question },
    });
  }

  /**
   * Handle player vote
   */
  handleVote(game: GameData, playerId: string, option: number): void {
    if (option < 1 || option > 3) {
      throw new ValidationError("Invalid vote option");
    }

    const player = requirePlayer(game, playerId);

    // Handle vote changes (undo previous vote)
    if (player.this_round.voted) {
      this.undoVote(player);
    }

    // Apply new vote
    this.applyVote(player, option);

    ingestEvent({
      gameID: game.id,
      event: "vote_cast",
      playerID: playerId,
      details: { vote: option, vote_str: player.this_round.vote },
    });
  }

  /**
   * Check if all players have voted
   */
  allPlayersVoted(game: GameData): boolean {
    const connectedPlayers = game.players.filter(p => p.connected);
    return connectedPlayers.every(player => player.this_round.voted);
  }

  /**
   * Proceed to next round
   */
  proceedToNextRound(game: GameData): void {

    // Reset waiting state
    game.waiting_for_players = false;

    ingestEvent({
      gameID: game.id,
      event: "round_completed",
      details: { all_players_voted: true },
    });
  }

  /**
   * Skip current round
   */
  skipCurrentRound(game: GameData, playerId: string): void {
    // Reset waiting state
    game.waiting_for_players = false;

    ingestEvent({
      gameID: game.id,
      event: "round_skipped",
      playerID: playerId,
      details: { manual_skip: true },
    });
  }

  /**
   * Handle round timeout
   */
  handleRoundTimeout(game: GameData): void {

    // Reset waiting state
    game.waiting_for_players = false;

    logger.info('[DEBUG] Round timeout processed, proceeding to next question');

    ingestEvent({
      gameID: game.id,
      event: "round_timeout",
      details: {
        connected_players: game.players.filter(p => p.connected).length,
        voted_players: game.players.filter(p => p.connected && p.this_round.voted).length
      },
    });
  }

  /**
   * Get sanitized game state
   */
  getSanitizedGameState(game: GameData): GameData {
    return sanitizeGameState(game);
  }

  /**
   * Get game state with timeout info
   */
  getGameStateWithTimeout(game: GameData, timeoutStart?: number, timeoutDuration?: number): GameData {
    if (!game.waiting_for_players || !timeoutStart) {
      return this.getSanitizedGameState(game);
    }

    const gameState = this.getSanitizedGameState(game);
    return {
      ...gameState,
      timeout_start: timeoutStart,
      timeout_duration: timeoutDuration || 10000,
    } as GameData;
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
}