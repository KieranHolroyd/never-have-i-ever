import { IWebSocketService } from "./services/websocket-service";
import { IHttpService } from "./services/http-service";
import type { IGameStateService } from "./services/game-state-service";
import logger from "./logger";

export class GameManager {
  private deploymentInProgress = false;

  constructor(
    private webSocketService: IWebSocketService,
    private httpService: IHttpService,
    private gameStateService?: IGameStateService
  ) {}

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
      if (!game) {
        return new Response(JSON.stringify({ error: "game_not_found" }), { status: 404 });
      }
      return Response.json({ ...game, active: game.players.filter(p => p.connected).length > 0 });
    } catch (error) {
      logger.error("Error fetching game:", error);
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
