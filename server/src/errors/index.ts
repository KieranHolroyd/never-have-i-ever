export class GameError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = "GameError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends GameError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      "NOT_FOUND",
      404,
      { resource, id }
    );
    this.name = "NotFoundError";
  }
}

export class GameFullError extends GameError {
  constructor() {
    super("Game is full", "GAME_FULL", 1013);
    this.name = "GameFullError";
  }
}

export class GameNotFoundError extends NotFoundError {
  constructor(gameId: string) {
    super("Game", gameId);
    this.name = "GameNotFoundError";
  }
}

export class PlayerNotFoundError extends NotFoundError {
  constructor(playerId: string) {
    super("Player", playerId);
    this.name = "PlayerNotFoundError";
  }
}

export class InvalidOperationError extends GameError {
  constructor(operation: string, reason?: string) {
    super(
      reason ? `Invalid operation: ${operation}. ${reason}` : `Invalid operation: ${operation}`,
      "INVALID_OPERATION",
      400,
      { operation, reason }
    );
    this.name = "InvalidOperationError";
  }
}
