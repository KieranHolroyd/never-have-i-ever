import { ingestEvent } from "./axiom";
import { config, SERVER_CONFIG, ROUTES, WEBSOCKET_PARAMS, REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS } from "./config";
import { GameSocket, SocketRouter, handle_incoming_message } from "./lib/router";
import { emit, publish, send } from "./lib/socket";
import { GameManager } from "./game-manager";
import { engineRegistry } from "./lib/engine-registry";
import { createNeverHaveIEverEngine } from "./lib/engines/never-have-i-ever";
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

// Initialize game manager
const gameManager = new GameManager();

// Setup WebSocket routes
SocketRouter.route("join_game", (ws, data) => gameManager.handleJoinGame(ws, data));
SocketRouter.route("select_catagories", (ws, data) => gameManager.handleSelectCategories(ws, data));
SocketRouter.route("select_catagory", (ws, data) => gameManager.handleSelectCategory(ws, data));
SocketRouter.route("confirm_selections", (ws, data) => gameManager.handleConfirmSelections(ws, data));
SocketRouter.route("next_question", (ws, data) => gameManager.handleNextQuestion(ws, data));
SocketRouter.route("reset_game", (ws, data) => gameManager.handleResetGame(ws, data));
SocketRouter.route("vote", (ws, data) => gameManager.handleVote(ws, data));
SocketRouter.route("ping", (ws, data) => gameManager.handlePing(ws, data));
SocketRouter.route("reconnect_status", async (ws, data) => await gameManager.handleReconnectStatus(ws, data));

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
    message: handle_incoming_message,
    open: (ws) => {
      ingestEvent({
        event: "websocket_connection_opened",
        playerID: ws.data.player,
      });

      // Check if this is a reconnection after deployment
      const isPostDeploymentReconnect = gameManager.isDeploymentInProgress();

      send(ws, "open", {
        message: "WebSocket connection opened",
        postDeploymentReconnect: isPostDeploymentReconnect
      });

      // Clear deployment flag after notifying the client
      if (isPostDeploymentReconnect) {
        gameManager.clearDeploymentFlag();
      }
    },
    close: (ws) => {
      gameManager.handleDisconnect(ws);
    },
    perMessageDeflate: true,
  },
  port: SERVER_CONFIG.PORT,
});

// Register the default engine backed by current GameManager handlers
engineRegistry.register(createNeverHaveIEverEngine(gameManager));

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
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  gameManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down server...');
  gameManager.cleanup();
  process.exit(0);
});
