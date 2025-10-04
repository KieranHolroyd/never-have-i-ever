import { z } from "zod";
import {
  ValidationError,
  BusinessRuleError,
  GameStateError,
  PlayerStateError,
  GameFullError,
  RateLimitError
} from "../errors/index";
import { IGameState, IPlayer, ICAHGameState, INHIEGameState } from "../types";
import logger from "../logger";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class ValidationService {
  private static readonly MAX_GAME_NAME_LENGTH = 50;
  private static readonly MAX_PLAYER_NAME_LENGTH = 50;
  private static readonly MIN_PLAYER_NAME_LENGTH = 1;
  private static readonly MAX_PLAYERS_DEFAULT = 20;
  private static readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100;

  /**
   * Validates player name according to business rules
   */
  static validatePlayerName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new ValidationError("Player name is required and must be a string");
    }

    const trimmed = name.trim();
    if (trimmed.length < this.MIN_PLAYER_NAME_LENGTH) {
      throw new ValidationError(`Player name must be at least ${this.MIN_PLAYER_NAME_LENGTH} character(s) long`);
    }

    if (trimmed.length > this.MAX_PLAYER_NAME_LENGTH) {
      throw new ValidationError(`Player name cannot exceed ${this.MAX_PLAYER_NAME_LENGTH} characters`);
    }

    // Check for inappropriate content (basic check)
    const inappropriatePatterns = [
      /\b(admin|administrator|mod|moderator|system|server)\b/i,
      /<script/i,
      /javascript:/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(trimmed)) {
        throw new BusinessRuleError("Player name contains inappropriate content");
      }
    }
  }

  /**
   * Validates game creation parameters
   */
  static validateGameCreation(gameType: string, options?: any): void {
    const validGameTypes = ['never-have-i-ever', 'cards-against-humanity'];
    if (!validGameTypes.includes(gameType)) {
      throw new ValidationError(`Invalid game type. Must be one of: ${validGameTypes.join(', ')}`);
    }

    if (options?.maxPlayers) {
      if (typeof options.maxPlayers !== 'number' || options.maxPlayers < 2 || options.maxPlayers > 50) {
        throw new ValidationError("maxPlayers must be a number between 2 and 50");
      }
    }
  }

  /**
   * Validates game state for operations
   */
  static validateGameState(gameState: IGameState, operation: string, requiredPhase?: string): void {
    if (!gameState) {
      throw new ValidationError("Game state is required");
    }

    if (gameState.gameCompleted) {
      throw new GameStateError("completed", "active", operation);
    }

    if (requiredPhase && gameState.phase !== requiredPhase) {
      throw new GameStateError(gameState.phase, requiredPhase, operation);
    }
  }

  /**
   * Validates player state for operations
   */
  static validatePlayerState(player: IPlayer, operation: string, requiredConnected: boolean = true): void {
    if (!player) {
      throw new ValidationError("Player is required");
    }

    if (requiredConnected && !player.connected) {
      throw new PlayerStateError(player.id, "disconnected", "connected", operation);
    }
  }

  /**
   * Validates that a game is not full
   */
  static validateGameCapacity(gameState: IGameState, maxPlayers: number = this.MAX_PLAYERS_DEFAULT): void {
    const connectedPlayers = gameState.players.filter(p => p.connected).length;
    if (connectedPlayers >= maxPlayers) {
      throw new GameFullError(maxPlayers);
    }
  }

  /**
   * Validates player uniqueness in game
   */
  static validatePlayerUniqueness(gameState: IGameState, playerName: string, excludePlayerId?: string): void {
    const existingPlayer = gameState.players.find(p =>
      p.name.toLowerCase() === playerName.toLowerCase() &&
      p.id !== excludePlayerId &&
      p.connected
    );

    if (existingPlayer) {
      throw new BusinessRuleError("Player name already exists in this game");
    }
  }

  /**
   * Validates category selection
   */
  static validateCategorySelection(selectedCategories: string[], availableCategories: string[]): void {
    if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) {
      throw new ValidationError("At least one category must be selected");
    }

    if (selectedCategories.length > 10) {
      throw new ValidationError("Cannot select more than 10 categories");
    }

    const invalidCategories = selectedCategories.filter(cat => !availableCategories.includes(cat));
    if (invalidCategories.length > 0) {
      throw new ValidationError(`Invalid categories selected: ${invalidCategories.join(', ')}`);
    }
  }

  /**
   * Validates vote submission for Never Have I Ever
   */
  static validateVoteSubmission(gameState: INHIEGameState, playerId: string, vote: number): void {
    this.validateGameState(gameState, "vote");

    const player = gameState.players.find(p => p.id === playerId);
    this.validatePlayerState(player, "vote");

    if (player.this_round.voted) {
      throw new BusinessRuleError("Player has already voted this round");
    }

    const validVotes = [1, 2, 3]; // Have, Have Not, Kinda
    if (!validVotes.includes(vote)) {
      throw new ValidationError(`Invalid vote. Must be one of: ${validVotes.join(', ')}`);
    }
  }

  /**
   * Validates CAH card submission
   */
  static validateCAHSubmission(gameState: ICAHGameState, playerId: string, cardIds: string[]): void {
    this.validateGameState(gameState, "submit_cards");

    const player = gameState.players.find(p => p.id === playerId) as any;
    this.validatePlayerState(player, "submit_cards");

    if (player.isJudge) {
      throw new BusinessRuleError("Judge cannot submit cards");
    }

    if (!gameState.currentBlackCard) {
      throw new BusinessRuleError("No active black card for submission");
    }

    const requiredCards = gameState.currentBlackCard.pick;
    if (cardIds.length !== requiredCards) {
      throw new ValidationError(`Must submit exactly ${requiredCards} card(s) for this black card`);
    }

    // Check if player has these cards
    const hasAllCards = cardIds.every(cardId =>
      player.hand.some((card: any) => card.id === cardId)
    );

    if (!hasAllCards) {
      throw new BusinessRuleError("Player does not have one or more of the submitted cards");
    }

    // Check for duplicate submissions this round
    const alreadySubmitted = gameState.submittedCards.some(sub => sub.playerId === playerId);
    if (alreadySubmitted) {
      throw new BusinessRuleError("Player has already submitted cards this round");
    }
  }

  /**
   * Validates CAH judging
   */
  static validateCAHJudge(gameState: ICAHGameState, judgeId: string, winnerId: string): void {
    this.validateGameState(gameState, "judge_cards");

    const judge = gameState.players.find(p => p.id === judgeId) as any;
    this.validatePlayerState(judge, "judge_cards");

    if (!judge.isJudge) {
      throw new BusinessRuleError("Only the judge can select a winner");
    }

    const winnerSubmission = gameState.submittedCards.find(sub => sub.playerId === winnerId);
    if (!winnerSubmission) {
      throw new ValidationError("Selected winner did not submit cards this round");
    }
  }

  /**
   * Rate limiting validation
   */
  static validateRateLimit(identifier: string, maxRequests: number = this.RATE_LIMIT_MAX_REQUESTS): void {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS;

    let userLimit = rateLimitStore.get(identifier);
    if (!userLimit || userLimit.resetTime < windowStart) {
      userLimit = { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW_MS };
      rateLimitStore.set(identifier, userLimit);
    }

    userLimit.count++;
    if (userLimit.count > maxRequests) {
      throw new RateLimitError(maxRequests, this.RATE_LIMIT_WINDOW_MS);
    }
  }

  /**
   * Validates WebSocket message structure using Zod schema
   */
  static validateMessageStructure<T>(data: any, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Message validation failed", {
          issues: error.issues,
          data: JSON.stringify(data).substring(0, 500)
        });
        throw new ValidationError(`Invalid message structure: ${error.issues.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Comprehensive game operation validation
   */
  static validateGameOperation(
    gameState: IGameState,
    playerId: string,
    operation: string,
    data?: any
  ): void {
    // Rate limiting
    this.validateRateLimit(`${playerId}:${operation}`, 10); // 10 requests per minute per operation

    // Basic validations
    this.validateGameState(gameState, operation);

    const player = gameState.players.find(p => p.id === playerId);
    this.validatePlayerState(player, operation);

    // Operation-specific validations
    switch (operation) {
      case 'join_game':
        this.validateGameCapacity(gameState);
        if (data?.playername) {
          this.validatePlayerName(data.playername);
          this.validatePlayerUniqueness(gameState, data.playername);
        }
        break;

      case 'select_categories':
        if (gameState.gameType === 'never-have-i-ever') {
          const nhieState = gameState as INHIEGameState;
          if (data?.categories) {
            this.validateCategorySelection(data.categories, Object.keys(nhieState.data));
          }
        }
        break;

      case 'vote':
        if (gameState.gameType === 'never-have-i-ever') {
          this.validateVoteSubmission(gameState as INHIEGameState, playerId, data?.option);
        }
        break;

      case 'submit_cards':
        if (gameState.gameType === 'cards-against-humanity') {
          this.validateCAHSubmission(gameState as ICAHGameState, playerId, data?.cardIds || []);
        }
        break;

      case 'judge_cards':
        if (gameState.gameType === 'cards-against-humanity') {
          this.validateCAHJudge(gameState as ICAHGameState, playerId, data?.winnerId);
        }
        break;
    }
  }

  /**
   * Cleanup old rate limit entries
   */
  static cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Periodic cleanup of rate limits
setInterval(() => {
  ValidationService.cleanupRateLimits();
}, 60000); // Clean up every minute

export default ValidationService;