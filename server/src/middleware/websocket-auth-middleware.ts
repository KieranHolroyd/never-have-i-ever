import { GameSocket } from "../lib/router";

export interface WebSocketContext {
  ws: GameSocket;
  data: any;
  gameManager: any; // Using any to avoid circular imports
}

export interface WebSocketMiddleware {
  (context: WebSocketContext, next: () => Promise<void>): Promise<void>;
}

export class WebSocketAuthMiddleware {
  static async authenticate(context: WebSocketContext, next: () => Promise<void>): Promise<void> {
    const { ws, data, gameManager } = context;

    // Validate required metadata
    if (!ws.data.game || !ws.data.player || !ws.data.playing) {
      throw new Error("Missing required WebSocket metadata: game, player, or playing");
    }

    // Allow join_game(create=true) to reach the engine so it can create the game.
    if (data?.op === "join_game" && data?.create === true) {
      return next();
    }

    // Validate game exists
    const exists = await gameManager.gameExists(ws.data.game);
    if (!exists) {
      throw new Error("Game not found");
    }

    return next();
  }
}