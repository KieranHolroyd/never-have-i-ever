import { GameData } from "../types";
import { config } from "../config";
import { IHttpService } from "./http-service";
import { deepCopy } from "../utils";
import { ingestEvent } from "../axiom";
import logger from "../logger";

export interface IPersistenceService {
  loadGame(gameId: string): Promise<GameData | null>;
  createGame(gameId: string): Promise<GameData>;
  saveGame(game: GameData): Promise<void>;
  saveActiveGames(games: Map<string, GameData>): Promise<void>;
}

export class PersistenceService implements IPersistenceService {
  constructor(private httpService: IHttpService) {}

  async loadGame(gameId: string): Promise<GameData | null> {
    const filePath = `${config.GAME_DATA_DIR}${gameId}.json`;

    try {
      const gameFile = Bun.file(filePath);
      if (await gameFile.exists()) {
        const gameData = await gameFile.json() as GameData;
        return gameData;
      }
    } catch (error) {
      logger.error(`Error loading game ${gameId}:`, error);
    }

    return null;
  }

  async createGame(gameId: string): Promise<GameData> {
    const questionsList = await this.httpService.getQuestionsList();

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

  async saveGame(game: GameData): Promise<void> {
    const filename = `${game.id}.json`;
    const filePath = `${config.GAME_DATA_DIR}${filename}`;

    try {
      const currentFile = Bun.file(filePath);
      if (await currentFile.exists()) {
        const currentGame = await currentFile.text();
        if (currentGame === JSON.stringify(game)) {
          return; // No changes
        }
      }

      await Bun.write(filePath, JSON.stringify(game));
    } catch (error) {
      throw error;
    }
  }

  async saveActiveGames(games: Map<string, GameData>): Promise<void> {
    for (const [gameId, game] of games) {
      const activePlayers = game.players.filter(p => p.connected).length;
      if (activePlayers === 0) continue;

      try {
        await this.saveGame(game);
        ingestEvent({
          event: "game_state_saved",
          gameID: gameId,
        });
      } catch (error) {
        logger.error(`Error saving game ${gameId}:`, error);
      }
    }
  }
}