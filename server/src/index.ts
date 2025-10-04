import { ingestEvent } from "./axiom";
import { config, SERVER_CONFIG, ROUTES, WEBSOCKET_PARAMS, REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS } from "./config";
import { GameSocket, SocketRouter, handle_incoming_message } from "./lib/router";
import { emit, publish, send } from "./lib/socket";
import { GameManager } from "./game-manager";
import { engineRegistry } from "./lib/engine-registry";
import { createNeverHaveIEverEngine } from "./lib/engines/never-have-i-ever";
import { createCardsAgainstHumanityEngine } from "./lib/engines/cards-against-humanity";
import { initializeRedisPool, closeRedisPool } from "./redis-pool";
import { WebSocketService, IWebSocketService } from "./services/websocket-service";
import { HttpService, IHttpService } from "./services/http-service";
import { PersistenceService, IPersistenceService } from "./services/persistence-service";
import { GameStateService, IGameStateService } from "./services/game-state-service";
import { createDefaultMiddlewarePipeline } from "./middleware";
import { container, SERVICE_TOKENS } from "./di";
import logger from "./logger";

// Validate environment variables
const missingRequired = REQUIRED_ENV_VARS.filter(envVar => !Bun.env[envVar]);
if (missingRequired.length > 0) {
  logger.error(`Missing required environment variables: ${missingRequired.join(", ")}`);
  process.exit(1);
}

const missingOptional = OPTIONAL_ENV_VARS.filter(envVar => !Bun.env[envVar]);
if (missingOptional.length > 0) {
  logger.warn(`Missing optional environment variables: ${missingOptional.join(", ")}`);
}

// Initialize Redis connection pool
try {
  await initializeRedisPool();
  logger.info("Redis connection pool initialized successfully");
} catch (error) {
  logger.error(`Failed to initialize Redis pool: ${(error as Error).message}`);
  logger.warn("Continuing with fallback mode");
}

// Register services with dependency injection container
container.registerClass(SERVICE_TOKENS.WebSocketService, WebSocketService, 'singleton');
container.registerClass(SERVICE_TOKENS.HttpService, HttpService, 'singleton');
container.registerClass(
  SERVICE_TOKENS.PersistenceService,
  PersistenceService,
  'singleton',
  [SERVICE_TOKENS.HttpService]
);
container.registerClass(SERVICE_TOKENS.GameStateService, GameStateService, 'singleton');
container.registerClass(
  SERVICE_TOKENS.GameManager,
  GameManager,
  'singleton',
  [SERVICE_TOKENS.WebSocketService, SERVICE_TOKENS.HttpService, SERVICE_TOKENS.PersistenceService]
);

// Resolve services from container
const webSocketService = container.resolve<IWebSocketService>(SERVICE_TOKENS.WebSocketService);
const httpService = container.resolve<IHttpService>(SERVICE_TOKENS.HttpService);
const persistenceService = container.resolve<IPersistenceService>(SERVICE_TOKENS.PersistenceService);
const gameStateService = container.resolve<IGameStateService>(SERVICE_TOKENS.GameStateService);
const gameManager = container.resolve<GameManager>(SERVICE_TOKENS.GameManager);

// Set up WebSocket middleware pipeline
const middlewarePipeline = createDefaultMiddlewarePipeline(gameManager);
SocketRouter.setMiddlewarePipeline(middlewarePipeline);

// Note: Do not register NHIE handlers globally here.
// Each engine must register its own operations to avoid cross-engine leakage.

const server = Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case ROUTES.HOME: {
        return new Response("Never Have I Ever", { status: 200 });
      }
      case ROUTES.WEBSOCKET: {
        const params = new URLSearchParams(url.search);

        const requiredParams = [WEBSOCKET_PARAMS.GAME, WEBSOCKET_PARAMS.PLAYER, WEBSOCKET_PARAMS.PLAYING];
        const missingParams = requiredParams.filter(param => !params.has(param));

        if (missingParams.length > 0) {
          return new Response(
            JSON.stringify({
              error: "missing_params",
              message: "Missing required parameters",
              error_fields: missingParams,
            }),
            { status: 1003 }
          );
        }

        const playing = params.get(WEBSOCKET_PARAMS.PLAYING) || "never-have-i-ever";
        const success = server.upgrade(req, {
          headers: {
            "X-Playing": playing,
            "X-Gameid": params.get(WEBSOCKET_PARAMS.GAME),
          },
          data: {
            game: params.get(WEBSOCKET_PARAMS.GAME),
            player: params.get(WEBSOCKET_PARAMS.PLAYER),
            playing,
          },
        });

        if (success) {
          return undefined;
        }

        return new Response("WebSocket upgrade required", { status: 400 });
      }
      case ROUTES.CATEGORIES_API: {
        return await gameManager.handleCategories();
      }
      case ROUTES.CAH_PACKS_API: {
        return await gameManager.handleCAHPacks();
      }
      case ROUTES.GAME_API: {
        return await gameManager.handleGame(req);
      }
      case ROUTES.GITHUB_WEBHOOK: {
        return await gameManager.handleGithubWebhook(req, server);
      }
      default: {
        return new Response("Not found", { status: 404 });
      }
    }
  },
  websocket: {
    message: (ws, message) => handle_incoming_message(ws as GameSocket, message, gameManager),
    open: (ws) => {
      const gameSocket = ws as GameSocket;
      ingestEvent({
        event: "websocket_connection_opened",
        playerID: gameSocket.data.player,
      });

      // Check if this is a reconnection after deployment
      const isPostDeploymentReconnect = gameManager.isDeploymentInProgress();

      send(gameSocket, "open", {
        message: "WebSocket connection opened",
        postDeploymentReconnect: isPostDeploymentReconnect
      });

      // Clear deployment flag after notifying the client
      if (isPostDeploymentReconnect) {
        gameManager.clearDeploymentFlag();
      }
    },
    close: (ws) => {
      const gameSocket = ws as GameSocket;
      if (gameSocket.data.playing === "never-have-i-ever") {
        // Handle NHIE disconnections using the engine
        const nhieEngine = engineRegistry.get("never-have-i-ever");
        if (nhieEngine && nhieEngine.handlers.disconnect) {
          nhieEngine.handlers.disconnect(gameSocket, {});
        }
      } else if (gameSocket.data.playing === "cards-against-humanity") {
        // Handle CAH disconnections
        const cahEngine = engineRegistry.get("cards-against-humanity");
        if (cahEngine && cahEngine.handlers.disconnect) {
          cahEngine.handlers.disconnect(gameSocket, {});
        }
      }
    },
    perMessageDeflate: true,
  },
  port: SERVER_CONFIG.PORT,
});

// Register the Never Have I Ever engine with dependency injection
engineRegistry.register(createNeverHaveIEverEngine(webSocketService, httpService, persistenceService, gameStateService));

// Register Cards Against Humanity engine
engineRegistry.register(createCardsAgainstHumanityEngine(gameManager, gameStateService));

// Auto-save games periodically
setInterval(async () => {
  await gameManager.saveActiveGames();
}, SERVER_CONFIG.GAME_SAVE_INTERVAL);

logger.info(`Server running at http://${server.hostname}:${server.port}/`);
logger.info(`Log level: ${process.env.LOG_LEVEL || 'INFO'}`);
if (logger.isFileLoggingEnabled()) {
  logger.info(`Server logs are being written to: ${logger.getLogFilePath()}`);
}

// Cleanup on shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  gameManager.cleanup();
  await closeRedisPool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  gameManager.cleanup();
  await closeRedisPool();
  process.exit(0);
});
