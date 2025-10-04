import { WebSocketContext, WebSocketMiddleware } from "./websocket-auth-middleware";
import logger from "../logger";

export class WebSocketLoggingMiddleware {
  static logRequest(context: WebSocketContext, next: () => Promise<void>): Promise<void> {
    const { ws, data } = context;
    const op = data.op || 'unknown';

    logger.info(`WebSocket Request: op=${op}, game=${ws.data.game}, player=${ws.data.player}, playing=${ws.data.playing}`, {
      op,
      gameId: ws.data.game,
      playerId: ws.data.player,
      playing: ws.data.playing,
      data: op !== 'ping' ? data : '[ping]'
    });

    const startTime = Date.now();

    return next().then(() => {
      const duration = Date.now() - startTime;
      logger.info(`WebSocket Response: op=${op}, duration=${duration}ms`, {
        op,
        gameId: ws.data.game,
        playerId: ws.data.player,
        duration
      });
    }).catch((error) => {
      const duration = Date.now() - startTime;
      logger.error(`WebSocket Error: op=${op}, duration=${duration}ms, error=${error.message}`, {
        op,
        gameId: ws.data.game,
        playerId: ws.data.player,
        duration,
        error: error.message
      });
      throw error;
    });
  }
}