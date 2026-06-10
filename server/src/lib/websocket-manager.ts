import { GameSocket } from "./router";
import { send, publish } from "./socket";

export class WebSocketManager {
  // Store WebSocket instances for broadcasting
  private gameWebSockets: Map<string, Set<GameSocket>> = new Map();

  /**
   * Store WebSocket connection for a game
   */
  addConnection(gameId: string, ws: GameSocket): void {
    if (!this.gameWebSockets.has(gameId)) {
      this.gameWebSockets.set(gameId, new Set());
    }
    this.gameWebSockets.get(gameId)!.add(ws);
  }

  /**
   * Remove WebSocket connection for a game
   */
  removeConnection(gameId: string, ws: GameSocket): void {
    const gameSockets = this.gameWebSockets.get(gameId);
    if (gameSockets) {
      gameSockets.delete(ws);
      if (gameSockets.size === 0) {
        this.gameWebSockets.delete(gameId);
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws: GameSocket, op: string, data: object = {}): void {
    send(ws, op, data);
  }

  /**
   * Broadcast message to all clients in a game and the requesting client
   */
  broadcastToGameAndClient(ws: GameSocket, op: string, data: object = {}): void {
    this.sendToClient(ws, op, data);
    this.broadcastToGame(ws.data.game, op, data);
  }

  /**
   * Broadcast message to all clients in a game (excluding sender)
   */
  broadcastToGame(gameId: string, op: string, data: object = {}): void {
    const gameSockets = this.gameWebSockets.get(gameId);
    if (!gameSockets || gameSockets.size === 0) {
      console.log('[DEBUG] No WebSocket instances found for game:', gameId);
      return;
    }

    // Publish exactly once via any connected socket to avoid duplicate messages.
    const iterator = gameSockets.values();
    const wsAny = iterator.next().value;
    if (!wsAny) return;

    try {
      publish(wsAny, gameId, op, data);
    } catch (error) {
      console.error('[DEBUG] Error broadcasting to game:', error);
    }
  }

  /**
   * Broadcast message to all connected clients across all games
   */
  broadcastToAllClients(op: string, data: object = {}): void {
    for (const gameSockets of this.gameWebSockets.values()) {
      for (const ws of gameSockets) {
        try {
          send(ws, op, data);
        } catch (error) {
          // Ignore errors when sending to individual clients
        }
      }
    }
  }

  /**
   * Get connection count for a game
   */
  getConnectionCount(gameId: string): number {
    return this.gameWebSockets.get(gameId)?.size ?? 0;
  }

  /**
   * Check if a game has any active connections
   */
  hasConnections(gameId: string): boolean {
    return this.getConnectionCount(gameId) > 0;
  }
}