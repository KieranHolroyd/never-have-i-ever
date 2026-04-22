// PersistenceService is deprecated — game state is now stored in Redis via GameStateService.
// This stub is kept only for backward compatibility during the migration.

export interface IPersistenceService {
  // All methods are no-ops; present only to satisfy legacy type references.
  loadGame(gameId: string): Promise<null>;
  createGame(gameId: string): Promise<never>;
  saveGame(game: any): Promise<void>;
  saveActiveGames(games: any): Promise<void>;
}

export class PersistenceService implements IPersistenceService {
  async loadGame(_gameId: string): Promise<null> {
    return null;
  }
  async createGame(_gameId: string): Promise<never> {
    throw new Error("PersistenceService is deprecated; use GameStateService");
  }
  async saveGame(_game: any): Promise<void> { /* no-op */ }
  async saveActiveGames(_games: any): Promise<void> { /* no-op */ }
}
