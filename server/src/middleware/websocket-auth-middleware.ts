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
  static authenticate(context: WebSocketContext, next: () => Promise<void>): Promise<void> {
    const { ws, gameManager } = context;

    // Validate required metadata
    if (!ws.data.game || !ws.data.player || !ws.data.playing) {
      throw new Error("Missing required WebSocket metadata: game, player, or playing");
    }

    // Validate game exists
    const game = gameManager['games'].get(ws.data.game);
    if (!game) {
      throw new Error("Game not found");
    }

    // Validate player exists in game (for joined players)
    const playerExists = game.players.some(p => p.id === ws.data.player);
    if (!playerExists) {
      // Allow new players to join, but validate they have a name when joining
      // This will be checked in the join handler
    }

    return next();
  }
}