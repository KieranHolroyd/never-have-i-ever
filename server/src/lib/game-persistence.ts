import { GameData, Catagories, CatagoriesSchema } from "../types";
import { config } from "../config";
import { client } from "../redis_client";
import Database from "bun:sqlite";
import { ValkeyJSON } from "../utils/json";
import { ingestEvent } from "../axiom";
import logger from "../logger";

export class GamePersistence {
  /**
   * Load game from filesystem
   */
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

  /**
   * Save game to filesystem
   */
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

  /**
   * Save all active games
   */
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

  /**
   * Load questions/categories data
   */
  async getQuestionsList(): Promise<Catagories> {
    // First check Valkey cache
    let questionsList = await ValkeyJSON.get(client, "shared:questions_list", CatagoriesSchema);

    if (!questionsList) {
      // Load from database if not in cache (categories are in main assets directory)
      const dbPath = `${import.meta.dir}/../../assets/db.sqlite`;
      const db = new Database(dbPath);

      try {
        const categoryRows = db.prepare("SELECT name, questions, is_nsfw FROM categories").all() as Array<{
          name: string;
          questions: string;
          is_nsfw: number;
        }>;

        const categoriesData: Catagories = {};

        for (const row of categoryRows) {
          categoriesData[row.name] = {
            flags: {
              is_nsfw: Boolean(row.is_nsfw)
            },
            questions: JSON.parse(row.questions)
          };
        }

        // Cache in Valkey for performance
        await ValkeyJSON.set(client, "shared:questions_list", categoriesData, CatagoriesSchema);
        questionsList = categoriesData;

        logger.info(`Loaded ${Object.keys(categoriesData).length} categories from database`);
      } catch (error) {
        logger.error("Failed to load categories from database:", error);
        // Fallback to mock data for testing or when database is unavailable
        questionsList = {
          'test-category': {
            flags: { is_nsfw: false },
            questions: ['Test question 1?', 'Test question 2?']
          }
        };
      } finally {
        db.close();
      }
    }

    return questionsList as Catagories;
  }

  /**
   * Load CAH packs data
   */
  async getCAHPacks(): Promise<Array<{
    id: string;
    name: string;
    blackCards: number;
    whiteCards: number;
    isOfficial: boolean;
    isNSFW: boolean;
  }>> {
    const dbPath = `${config.GAME_DATA_DIR}db.sqlite`;
    const db = new Database(dbPath);

    try {
      // Query to get pack information with card counts
      const packsQuery = `
        SELECT
          pack_name,
          card_type,
          COUNT(*) as card_count
        FROM cah_cards
        GROUP BY pack_name, card_type
        ORDER BY pack_name, card_type
      `;

      const packRows = db.prepare(packsQuery).all() as Array<{
        pack_name: string;
        card_type: string;
        card_count: number;
      }>;

      // Group by pack_name and create pack objects
      const packsMap = new Map<string, {
        id: string;
        name: string;
        blackCards: number;
        whiteCards: number;
        isOfficial: boolean;
        isNSFW: boolean;
      }>();

      for (const row of packRows) {
        const pack = packsMap.get(row.pack_name) || {
          id: row.pack_name,
          name: row.pack_name,
          blackCards: 0,
          whiteCards: 0,
          isOfficial: this.isOfficialPack(row.pack_name),
          isNSFW: this.isNSFWPack(row.pack_name),
        };

        if (row.card_type === 'black') {
          pack.blackCards = row.card_count;
        } else if (row.card_type === 'white') {
          pack.whiteCards = row.card_count;
        }

        packsMap.set(row.pack_name, pack);
      }

      const packs = Array.from(packsMap.values());
      db.close();
      return packs;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private isOfficialPack(packName: string): boolean {
    // Official packs are those from Cards Against Humanity LLC
    const officialPacks = [
      'CAH Base Set',
      'CAH: First Expansion',
      'CAH: Second Expansion',
      'CAH: Third Expansion',
      'CAH: Fourth Expansion',
      'CAH: Fifth Expansion',
      'CAH: Sixth Expansion',
      'CAH Base Set',
      'CAH: Box Expansion',
      'CAH: Red Box Expansion',
      'CAH: Blue Box Expansion',
      'CAH: Green Box Expansion',
      'CAH: Main Deck',
      'CAH: College Pack',
      'CAH: 2000s Nostalgia Pack',
      'CAH: A.I. Pack',
      'CAH: Ass Pack',
      'CAH: Human Pack',
      'CAH: Procedurally-Generated Cards',
      'CAH: Canadian Conversion Kit',
      'CAH: UK Conversion Kit',
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'CAH: Hidden Gems Bundle: A Few New Cards We Crammed Into This Bundle Pack (Amazon Exclusive)',
    ];
    return officialPacks.some(official => packName.startsWith(official.split(':')[0]));
  }

  private isNSFWPack(packName: string): boolean {
    // Most CAH packs are NSFW, but some are marked as family-friendly
    const cleanPacks = [
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'Kids Against Maturity',
      'Kids Create Absurdity',
      'KinderPerfect',
      'KinderPerfect: A Timeout For Parents (Kickstarter Set)',
      'KinderPerfect: More Expansion Pack',
      'KinderPerfect: Naughty Expansion Pack',
      'KinderPerfect: Tween Expansion Pack',
    ];
    return !cleanPacks.some(clean => packName.includes(clean));
  }
}