import { getClient } from "../redis_client";
import logger from "../logger";
import { CAHGameState, NHIEGameState, CAHPlayer, NHIEPlayer, CAHBlackCard, CAHWhiteCard, CAHSubmission } from "../types";

// Union type for all game states
export type GameState = CAHGameState | NHIEGameState;

export interface IGameStateService {
  getGame(gameId: string): Promise<GameState | null>;
  setGame(gameId: string, gameState: GameState): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
  hasGame(gameId: string): Promise<boolean>;
  getAllGameIds(): Promise<string[]>;
}

export class GameStateService implements IGameStateService {
  private readonly GAME_KEY_PREFIX = "game:";

  private getGameKey(gameId: string): string {
    return `${this.GAME_KEY_PREFIX}${gameId}`;
  }

  async getGame(gameId: string): Promise<GameState | null> {
    try {
      const client = await getClient();
      const key = this.getGameKey(gameId);
      const data = await client.get(key);

      if (!data) {
        return null;
      }

      return this.deserializeGameState(data);
    } catch (error) {
      logger.error(`Error getting game ${gameId}:`, error);
      return null;
    }
  }

  async setGame(gameId: string, gameState: GameState): Promise<void> {
    try {
      const client = await getClient();
      const key = this.getGameKey(gameId);
      const serialized = this.serializeGameState(gameState);

      await client.set(key, serialized);
    } catch (error) {
      logger.error(`Error setting game ${gameId}:`, error);
      throw error;
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    try {
      const client = await getClient();
      const key = this.getGameKey(gameId);
      await client.del(key);
    } catch (error) {
      logger.error(`Error deleting game ${gameId}:`, error);
      throw error;
    }
  }

  async hasGame(gameId: string): Promise<boolean> {
    try {
      const client = await getClient();
      const key = this.getGameKey(gameId);
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking if game ${gameId} exists:`, error);
      return false;
    }
  }

  async getAllGameIds(): Promise<string[]> {
    try {
      const client = await getClient();
      const pattern = `${this.GAME_KEY_PREFIX}*`;
      const keys = await client.keys(pattern);

      return keys.map(key => key.replace(this.GAME_KEY_PREFIX, ""));
    } catch (error) {
      logger.error("Error getting all game IDs:", error);
      return [];
    }
  }

  private serializeGameState(gameState: GameState): string {
    // Clean up any non-serializable properties
    const cleanedState = this.cleanGameState(gameState);
    return JSON.stringify(cleanedState);
  }

  private deserializeGameState(data: string): GameState {
    return JSON.parse(data) as GameState;
  }

  private cleanGameState(gameState: GameState): GameState {
    const cleaned = { ...gameState };

    // Remove NodeJS.Timeout from NHIE games as it's not serializable
    if ('round_timeout' in cleaned) {
      delete (cleaned as any).round_timeout;
    }

    return cleaned;
  }
}