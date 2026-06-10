import { GameData } from "../types";
import { GameSocket } from "./router";
import logger from "../logger";

export class TimeoutManager {
  private readonly ROUND_TIMEOUT_MS = 10000; // 10 seconds
  private timeoutStarts: Map<string, number> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start timeout for a game round
   */
  startTimeout(gameId: string, callback: () => Promise<void>): NodeJS.Timeout {
    // Clear any existing timeout
    this.clearTimeout(gameId);

    const timeoutStart = Date.now();
    this.timeoutStarts.set(gameId, timeoutStart);

    const timeout = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        logger.error(`Error in timeout callback for game ${gameId}:`, error);
      }
    }, this.ROUND_TIMEOUT_MS);

    this.timeouts.set(gameId, timeout);
    logger.debug('[DEBUG] Started timeout for game:', gameId, 'at:', timeoutStart);

    return timeout;
  }

  /**
   * Clear timeout for a game
   */
  clearTimeout(gameId: string): void {
    const timeout = this.timeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(gameId);
    }
    this.timeoutStarts.delete(gameId);
    logger.debug('[DEBUG] Cleared timeout for game:', gameId);
  }

  /**
   * Get the timeout object for a game
   */
  getTimeout(gameId: string): NodeJS.Timeout | undefined {
    return this.timeouts.get(gameId);
  }

  /**
   * Check if a game has an active timeout
   */
  hasTimeout(gameId: string): boolean {
    return this.timeouts.has(gameId);
  }

  /**
   * Get timeout start time for a game
   */
  getTimeoutStart(gameId: string): number | undefined {
    return this.timeoutStarts.get(gameId);
  }

  /**
   * Get remaining timeout in milliseconds
   */
  getRemainingTimeout(gameId: string): number {
    const startTime = this.timeoutStarts.get(gameId);
    if (!startTime) return 0;

    const elapsed = Date.now() - startTime;
    return Math.max(0, this.ROUND_TIMEOUT_MS - elapsed);
  }

  /**
   * Clear all timeouts (useful for cleanup)
   */
  clearAllTimeouts(): void {
    for (const [gameId, timeout] of this.timeouts) {
      clearTimeout(timeout);
      logger.debug('[DEBUG] Cleared timeout for game:', gameId);
    }
    this.timeouts.clear();
    this.timeoutStarts.clear();
  }

  /**
   * Get round timeout duration
   */
  getRoundTimeoutMs(): number {
    return this.ROUND_TIMEOUT_MS;
  }
}