import logger from "../logger";
import { ingestEvent } from "../axiom";

// Base error class with enhanced logging and monitoring
export class GameError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 400, details?: any, isOperational: boolean = true) {
    super(message);
    this.name = "GameError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    // Automatically log operational errors
    if (this.isOperational) {
      this.logError();
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  private logError(): void {
    const logData = {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp.toISOString()
    };

    logger.error(`${this.name}: ${this.message}`, logData);

    // Send to monitoring if configured
    ingestEvent({
      event: "application_error",
      error_type: this.name,
      error_code: this.code,
      message: this.message,
      status_code: this.statusCode,
      details: this.details,
      operational: this.isOperational,
      timestamp: this.timestamp.getTime()
    });
  }

  // Standardized error response format
  toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        timestamp: this.timestamp.toISOString()
      }
    };
  }
}

// Validation Errors
export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(schema: string, issues: any[]) {
    super(`Schema validation failed for ${schema}`, {
      schema,
      issues: issues.map(issue => ({
        field: issue.path?.join('.'),
        message: issue.message,
        code: issue.code
      }))
    });
    this.name = "SchemaValidationError";
  }
}

export class BusinessRuleError extends ValidationError {
  constructor(rule: string, details?: any) {
    super(`Business rule violation: ${rule}`, details);
    this.name = "BusinessRuleError";
  }
}

// Resource Errors
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

export class CategoryNotFoundError extends NotFoundError {
  constructor(categoryId: string) {
    super("Category", categoryId);
    this.name = "CategoryNotFoundError";
  }
}

// Operation Errors
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

export class GameStateError extends InvalidOperationError {
  constructor(currentState: string, requiredState: string, operation: string) {
    super(operation, `Invalid game state. Current: ${currentState}, Required: ${requiredState}`);
    this.name = "GameStateError";
  }
}

export class PlayerStateError extends InvalidOperationError {
  constructor(playerId: string, currentState: string, requiredState: string, operation: string) {
    super(operation, `Invalid player state for ${playerId}. Current: ${currentState}, Required: ${requiredState}`);
    this.name = "PlayerStateError";
  }
}

// Capacity and Limit Errors
export class GameFullError extends GameError {
  constructor(maxPlayers: number) {
    super(`Game is full (maximum ${maxPlayers} players)`, "GAME_FULL", 1013, { maxPlayers });
    this.name = "GameFullError";
  }
}

export class RateLimitError extends GameError {
  constructor(limit: number, windowMs: number) {
    super(`Rate limit exceeded: ${limit} requests per ${windowMs}ms`, "RATE_LIMIT_EXCEEDED", 429, { limit, windowMs });
    this.name = "RateLimitError";
  }
}

// Authentication and Authorization Errors
export class AuthenticationError extends GameError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends GameError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "AUTHORIZATION_ERROR", 403);
    this.name = "AuthorizationError";
  }
}

// System Errors
export class DatabaseError extends GameError {
  constructor(operation: string, details?: any) {
    super(`Database operation failed: ${operation}`, "DATABASE_ERROR", 500, details, false);
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends GameError {
  constructor(service: string, operation: string, details?: any) {
    super(`External service error: ${service} - ${operation}`, "EXTERNAL_SERVICE_ERROR", 502, details, false);
    this.name = "ExternalServiceError";
  }
}

export class ConfigurationError extends GameError {
  constructor(setting: string, details?: any) {
    super(`Configuration error: ${setting}`, "CONFIGURATION_ERROR", 500, details, false);
    this.name = "ConfigurationError";
  }
}

// Timeout Errors
export class TimeoutError extends GameError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation timeout: ${operation} (${timeoutMs}ms)`, "TIMEOUT_ERROR", 408, { operation, timeoutMs });
    this.name = "TimeoutError";
  }
}

// Utility functions for error handling
export function isOperationalError(error: Error): boolean {
  return error instanceof GameError && error.isOperational;
}

export function getErrorResponse(error: Error): any {
  if (error instanceof GameError) {
    return error.toResponse();
  }

  // For unexpected errors, create a generic response
  const genericError = new GameError(
    "An unexpected error occurred",
    "INTERNAL_ERROR",
    500,
    { originalError: error.message },
    false
  );

  return genericError.toResponse();
}
