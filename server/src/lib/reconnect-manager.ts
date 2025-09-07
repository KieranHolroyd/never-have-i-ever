import { GameSocket } from "./router";
import { send } from "./socket";
import { SERVER_CONFIG } from "../config";
import logger from "../logger";

interface ReconnectAttempt {
  gameId: string;
  playerId: string;
  attemptCount: number;
  nextAttemptAt: number;
  timeoutId: NodeJS.Timeout;
  startTime: number;
}

export class ReconnectManager {
  private reconnectAttempts: Map<string, ReconnectAttempt> = new Map();

  /**
   * Start reconnect attempts for a disconnected player
   */
  startReconnect(ws: GameSocket): void {
    const key = this.getKey(ws.data.game, ws.data.player);

    // Clear any existing reconnect attempt for this player
    this.clearReconnect(key);

    const attempt: ReconnectAttempt = {
      gameId: ws.data.game,
      playerId: ws.data.player,
      attemptCount: 0,
      nextAttemptAt: Date.now() + SERVER_CONFIG.RECONNECT.INITIAL_INTERVAL,
      timeoutId: null as any,
      startTime: Date.now(),
    };

    this.reconnectAttempts.set(key, attempt);
    this.scheduleNextAttempt(attempt);

    logger.info(`Started reconnect attempts for player ${ws.data.player} in game ${ws.data.game}`);
  }

  /**
   * Stop reconnect attempts for a player (when they successfully reconnect)
   */
  stopReconnect(gameId: string, playerId: string): void {
    const key = this.getKey(gameId, playerId);
    this.clearReconnect(key);
  }

  /**
   * Check if a player has an active reconnect attempt
   */
  hasActiveReconnect(gameId: string, playerId: string): boolean {
    const key = this.getKey(gameId, playerId);
    return this.reconnectAttempts.has(key);
  }

  /**
   * Get reconnect status for a player
   */
  getReconnectStatus(gameId: string, playerId: string): {
    isReconnecting: boolean;
    attemptCount: number;
    nextAttemptIn: number;
  } | null {
    const key = this.getKey(gameId, playerId);
    const attempt = this.reconnectAttempts.get(key);

    if (!attempt) {
      return null;
    }

    return {
      isReconnecting: true,
      attemptCount: attempt.attemptCount,
      nextAttemptIn: Math.max(0, attempt.nextAttemptAt - Date.now()),
    };
  }

  private scheduleNextAttempt(attempt: ReconnectAttempt): void {
    const delay = Math.max(0, attempt.nextAttemptAt - Date.now());

    attempt.timeoutId = setTimeout(() => {
      this.performReconnectAttempt(attempt);
    }, delay);
  }

  private async performReconnectAttempt(attempt: ReconnectAttempt): Promise<void> {
    attempt.attemptCount++;

    const timeElapsed = Date.now() - attempt.startTime;
    const isInitialPhase = timeElapsed < SERVER_CONFIG.RECONNECT.INITIAL_PHASE_DURATION;

    let nextInterval: number;

    if (isInitialPhase) {
      // During initial 2 minutes, use fixed 10-second intervals
      nextInterval = SERVER_CONFIG.RECONNECT.INITIAL_INTERVAL;
    } else {
      // After initial phase, use exponential backoff
      const backoffAttempts = attempt.attemptCount - Math.floor(SERVER_CONFIG.RECONNECT.INITIAL_PHASE_DURATION / SERVER_CONFIG.RECONNECT.INITIAL_INTERVAL);
      nextInterval = SERVER_CONFIG.RECONNECT.INITIAL_INTERVAL * Math.pow(SERVER_CONFIG.RECONNECT.BACKOFF_MULTIPLIER, Math.max(0, backoffAttempts - 1));
      nextInterval = Math.min(nextInterval, SERVER_CONFIG.RECONNECT.MAX_INTERVAL);
    }

    logger.info(`Reconnect attempt ${attempt.attemptCount} for player ${attempt.playerId} in game ${attempt.gameId}. Next attempt in ${nextInterval}ms`);

    // Here we would normally attempt to notify the client or check for reconnection
    // For now, we'll just update the attempt and schedule the next one
    // The actual reconnection will be handled when the client reconnects via WebSocket

    if (attempt.attemptCount >= SERVER_CONFIG.RECONNECT.MAX_ATTEMPTS) {
      logger.info(`Max reconnect attempts (${SERVER_CONFIG.RECONNECT.MAX_ATTEMPTS}) reached for player ${attempt.playerId} in game ${attempt.gameId}`);
      this.clearReconnect(this.getKey(attempt.gameId, attempt.playerId));
      return;
    }

    attempt.nextAttemptAt = Date.now() + nextInterval;
    this.scheduleNextAttempt(attempt);
  }

  private clearReconnect(key: string): void {
    const attempt = this.reconnectAttempts.get(key);
    if (attempt) {
      if (attempt.timeoutId) {
        clearTimeout(attempt.timeoutId);
      }
      this.reconnectAttempts.delete(key);
      logger.info(`Cleared reconnect attempts for key ${key}`);
    }
  }

  private getKey(gameId: string, playerId: string): string {
    return `${gameId}:${playerId}`;
  }

  /**
   * Clean up all reconnect attempts (useful for graceful shutdown)
   */
  cleanup(): void {
    for (const [key, attempt] of this.reconnectAttempts) {
      if (attempt.timeoutId) {
        clearTimeout(attempt.timeoutId);
      }
    }
    this.reconnectAttempts.clear();
    logger.info("Reconnect manager cleanup completed");
  }
}

// Export singleton instance
export const reconnectManager = new ReconnectManager();
