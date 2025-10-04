import { WebSocketContext } from "./websocket-auth-middleware";
import { send } from "../lib/socket";
import { GameError, getErrorResponse } from "../errors/index";
import logger from "../logger";

export class WebSocketErrorMiddleware {
  static handleErrors(context: WebSocketContext, next: () => Promise<void>): Promise<void> {
    const { ws, data } = context;

    return next().catch((error) => {
      const op = data.op || 'unknown';

      // Enhanced error logging with context
      const errorContext = {
        operation: op,
        gameId: ws.data.game,
        playerId: ws.data.player,
        timestamp: new Date().toISOString()
      };

      // Log operational vs system errors differently
      if (error instanceof GameError && error.isOperational) {
        logger.warn(`Operational error in ${op}: ${error.message}`, {
          ...errorContext,
          errorCode: error.code,
          errorDetails: error.details
        });
      } else {
        logger.error(`System error in ${op}: ${error.message}`, {
          ...errorContext,
          error: error.message,
          stack: error.stack,
          isOperational: error instanceof GameError ? error.isOperational : false
        });
      }

      // Get standardized error response
      const errorResponse = getErrorResponse(error);

      // Add operation context to response
      errorResponse.error.operation = op;

      // Send standardized error response to client
      send(ws, "error", errorResponse);

      // For critical system errors, we might want to close the connection
      if (error instanceof GameError && !error.isOperational) {
        logger.warn(`Closing WebSocket connection due to system error`, {
          gameId: ws.data.game,
          playerId: ws.data.player,
          operation: op
        });

        try {
          ws.close(1011, "Internal server error"); // 1011 = Internal Error
        } catch (closeError) {
          logger.error("Failed to close WebSocket connection", { closeError });
        }
      }

      // Don't re-throw the error - we've handled it
    });
  }
}