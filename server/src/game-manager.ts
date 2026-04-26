import { IWebSocketService } from "./services/websocket-service";
import { IHttpService } from "./services/http-service";
import type { IGameStateService } from "./services/game-state-service";
import type { ICAHGameStateService } from "./services/cah-game-state-service";
import type { ActiveGamesResponse } from "./types";
import logger from "./logger";

export class GameManager {
  private deploymentInProgress = false;

  constructor(
    private webSocketService: IWebSocketService,
    private httpService: IHttpService,
    private gameStateService?: IGameStateService,
    private cahGameStateService?: ICAHGameStateService
  ) {}

  async gameExists(gameId: string): Promise<boolean> {
    const [nhieExists, cahExists] = await Promise.all([
      this.gameStateService ? this.gameStateService.gameExists(gameId) : Promise.resolve(false),
      this.cahGameStateService ? this.cahGameStateService.gameExists(gameId) : Promise.resolve(false),
    ]);
    return nhieExists || cahExists;
  }

  async handleCategories(): Promise<Response> {
    return await this.httpService.handleCategories();
  }

  async handleCAHPacks(): Promise<Response> {
    return await this.httpService.handleCAHPacks();
  }

  async handleGame(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const gameId = url.searchParams.get("id");
      if (!gameId) {
        return new Response(JSON.stringify({ error: "no_gameid" }), { status: 400 });
      }
      if (!this.gameStateService) {
        return new Response(JSON.stringify({ error: "service_unavailable" }), { status: 503 });
      }
      const game = await this.gameStateService.getFullGameState(gameId);
      const meta = await this.gameStateService.getGameMeta(gameId);
      if (!game) {
        return new Response(JSON.stringify({ error: "game_not_found" }), { status: 404 });
      }
      return Response.json({
        ...game,
        active: game.players.filter(p => p.connected).length > 0,
        passwordProtected: Boolean(meta?.password_hash),
      });
    } catch (error) {
      logger.error("Error fetching game:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  }

  async handleCahGame(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const gameId = url.searchParams.get("id");
      if (!gameId) {
        return new Response(JSON.stringify({ error: "no_gameid" }), { status: 400 });
      }
      if (!this.cahGameStateService) {
        return new Response(JSON.stringify({ error: "service_unavailable" }), { status: 503 });
      }
      // Pass empty string so no player's hand is exposed in the API response
      const game = await this.cahGameStateService.getFullGameState(gameId, "");
      const meta = await this.cahGameStateService.getGameMeta(gameId);
      if (!game) {
        return new Response(JSON.stringify({ error: "game_not_found" }), { status: 404 });
      }
      const active = game.players.filter((p) => p.connected).length > 0;
      return Response.json({ ...game, active, passwordProtected: Boolean(meta?.passwordHash) });
    } catch (error) {
      logger.error("Error fetching CAH game:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  }

  async handleActiveGames(): Promise<Response> {
    try {
      const [nhieGames, cahGames] = await Promise.all([
        this.gameStateService ? this.gameStateService.listActiveGames() : Promise.resolve([]),
        this.cahGameStateService ? this.cahGameStateService.listActiveGames() : Promise.resolve([]),
      ]);

      const response: ActiveGamesResponse = {
        games: [...nhieGames, ...cahGames].sort(
          (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
        ),
      };

      return Response.json(response);
    } catch (error) {
      logger.error("Error fetching active games:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  }

  async handleGithubWebhook(request: Request, server: any): Promise<Response> {
    this.deploymentInProgress = true;
    return await this.httpService.handleGithubWebhook(request, server, this.deploymentInProgress);
  }

  async saveActiveGames(): Promise<void> {
    // No-op: Redis persistence is handled per-operation; no periodic save needed.
  }

  isDeploymentInProgress(): boolean {
    return this.deploymentInProgress;
  }

  clearDeploymentFlag(): void {
    this.deploymentInProgress = false;
  }

  cleanup(): void {
    logger.info("GameManager cleanup initiated");
    logger.info("GameManager cleanup completed");
  }
}
