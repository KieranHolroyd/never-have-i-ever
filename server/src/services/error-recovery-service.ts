import { GameError, DatabaseError, ExternalServiceError } from "../errors/index";
import logger from "../logger";
import { ingestEvent } from "../axiom";

export interface RecoveryStrategy {
  canRecover(error: Error): boolean;
  recover(error: Error, context?: any): Promise<any>;
  name: string;
}

export class DatabaseRetryStrategy implements RecoveryStrategy {
  name = "database_retry";
  private maxRetries: number;
  private backoffMs: number;

  constructor(maxRetries = 3, backoffMs = 1000) {
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
  }

  canRecover(error: Error): boolean {
    return error instanceof DatabaseError && this.isRetryableError(error);
  }

  private isRetryableError(error: DatabaseError): boolean {
    // Check for transient database errors
    const retryableMessages = [
      'connection timeout',
      'connection refused',
      'connection reset',
      'deadlock',
      'lock wait timeout',
      'temporary failure'
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some(retryable => message.includes(retryable));
  }

  async recover(error: Error, context?: any): Promise<any> {
    const operation = context?.operation || 'unknown';

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Database recovery attempt ${attempt}/${this.maxRetries} for ${operation}`);

        // Wait with exponential backoff
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, this.backoffMs * Math.pow(2, attempt - 2)));
        }

        // Retry the operation
        if (context?.retryFunction) {
          return await context.retryFunction();
        }

        return true; // Success if no retry function provided
      } catch (retryError) {
        logger.warn(`Database recovery attempt ${attempt} failed: ${retryError.message}`);

        if (attempt === this.maxRetries) {
          throw new DatabaseError(operation, {
            originalError: error.message,
            attempts: attempt,
            recoveryStrategy: this.name
          });
        }
      }
    }
  }
}

export class CircuitBreakerStrategy implements RecoveryStrategy {
  name = "circuit_breaker";
  private failureCount = 0;
  private lastFailureTime = 0;
  private failureThreshold: number;
  private recoveryTimeoutMs: number;
  private isOpen = false;

  constructor(failureThreshold = 5, recoveryTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
  }

  canRecover(error: Error): boolean {
    return error instanceof ExternalServiceError;
  }

  async recover(error: Error, context?: any): Promise<any> {
    const now = Date.now();

    // Check if circuit breaker should transition from open to half-open
    if (this.isOpen && (now - this.lastFailureTime) > this.recoveryTimeoutMs) {
      this.isOpen = false;
      this.failureCount = 0;
      logger.info("Circuit breaker transitioning to half-open state");
    }

    if (this.isOpen) {
      throw new ExternalServiceError(
        context?.service || 'unknown',
        context?.operation || 'unknown',
        { circuitBreaker: 'open', failureCount: this.failureCount }
      );
    }

    // Record failure
    this.failureCount++;
    this.lastFailureTime = now;

    // Open circuit if threshold exceeded
    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);

      ingestEvent({
        event: "circuit_breaker_opened",
        service: context?.service,
        operation: context?.operation,
        failure_count: this.failureCount,
        timestamp: now
      });
    }

    throw error; // Re-throw original error
  }
}

export class FallbackStrategy implements RecoveryStrategy {
  name = "fallback";

  canRecover(error: Error): boolean {
    // Can recover from most operational errors
    return error instanceof GameError && error.isOperational;
  }

  async recover(error: Error, context?: any): Promise<any> {
    const operation = context?.operation || 'unknown';

    logger.info(`Applying fallback strategy for ${operation}`);

    // Provide default values based on operation
    switch (operation) {
      case 'get_game_state':
        return { players: [], phase: 'waiting', waitingForPlayers: false, gameCompleted: false };

      case 'get_player_list':
        return [];

      case 'get_categories':
        return { default: { flags: { is_nsfw: false }, questions: [] } };

      default:
        // Return null/undefined to indicate fallback was applied but no default value
        return null;
    }
  }
}

export class ErrorRecoveryService {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    // Register default strategies
    this.registerStrategy(new DatabaseRetryStrategy());
    this.registerStrategy(new CircuitBreakerStrategy());
    this.registerStrategy(new FallbackStrategy());
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    logger.info(`Registered error recovery strategy: ${strategy.name}`);
  }

  async attemptRecovery(error: Error, context?: any): Promise<any> {
    const applicableStrategies = this.strategies.filter(strategy => strategy.canRecover(error));

    if (applicableStrategies.length === 0) {
      logger.debug("No recovery strategies available for error", { error: error.message });
      throw error;
    }

    for (const strategy of applicableStrategies) {
      try {
        logger.info(`Attempting error recovery with strategy: ${strategy.name}`);
        const result = await strategy.recover(error, context);

        ingestEvent({
          event: "error_recovery_success",
          strategy: strategy.name,
          operation: context?.operation,
          error_type: error.constructor.name,
          timestamp: Date.now()
        });

        return result;
      } catch (recoveryError) {
        logger.warn(`Recovery strategy ${strategy.name} failed: ${recoveryError.message}`);
        // Continue to next strategy
      }
    }

    // All strategies failed
    logger.error("All error recovery strategies failed", {
      error: error.message,
      strategies_attempted: applicableStrategies.map(s => s.name)
    });

    ingestEvent({
      event: "error_recovery_failed",
      strategies_attempted: applicableStrategies.map(s => s.name),
      operation: context?.operation,
      error_type: error.constructor.name,
      timestamp: Date.now()
    });

    throw error;
  }

  /**
   * Wraps a function with automatic error recovery
   */
  async withRecovery<T>(
    operation: () => Promise<T>,
    context?: { operation?: string; [key: string]: any }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return await this.attemptRecovery(error, {
        retryFunction: operation,
        ...context
      });
    }
  }

  /**
   * Graceful degradation - returns a default value when operation fails
   */
  async withGracefulDegradation<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    context?: { operation?: string; [key: string]: any }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`Operation failed, using graceful degradation: ${error.message}`, {
        operation: context?.operation,
        error: error.message
      });

      ingestEvent({
        event: "graceful_degradation_applied",
        operation: context?.operation,
        error_type: error.constructor.name,
        timestamp: Date.now()
      });

      return defaultValue;
    }
  }
}

// Singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;