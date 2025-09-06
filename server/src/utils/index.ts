import { GameData, Player } from "../types";

export function deepCopy<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("Error in deepCopy:", e);
    throw e;
  }
}

export function omitKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function validateRequiredParams(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => !params[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}

export function getActivePlayerCount(game: GameData): number {
  return game.players.filter(p => p.connected).length;
}

export function isGameActive(game: GameData): boolean {
  return getActivePlayerCount(game) > 0;
}

export function sanitizeGameState(game: GameData): Omit<GameData, 'data' | 'history'> {
  return omitKeys(game, ['data', 'history']);
}

export function sanitizeGameStateWithHistory(game: GameData): Omit<GameData, 'data'> {
  return omitKeys(game, ['data']);
}

export function findPlayerById(game: GameData, playerId: string): Player | undefined {
  return game.players.find(p => p.id === playerId);
}

export function requirePlayer(game: GameData, playerId: string): Player {
  const player = findPlayerById(game, playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found in game ${game.id}`);
  }
  return player;
}
