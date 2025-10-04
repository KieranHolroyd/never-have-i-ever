import { GameSocket } from "../lib/router";
import { GameData } from "../types";

export interface IWebSocketService {
  sendToClient(ws: GameSocket, op: string, data?: object): void;
  broadcastToGameAndClient(ws: GameSocket, op: string, data?: object): void;
  publishToGame(ws: GameSocket, op: string, data?: object): void;
  broadcastToGame(gameId: string, op: string, data?: object): void;
  handleDisconnect(ws: GameSocket, game: GameData): void;
  handleReconnectStatus(ws: GameSocket): Promise<void>;
  handlePing(ws: GameSocket): Promise<void>;
  addWebSocket(gameId: string, ws: GameSocket): void;
  removeWebSocket(gameId: string, ws: GameSocket): void;
  hasWebSockets(gameId: string): boolean;
  getTimeoutStart(gameId: string): number | undefined;
  setTimeoutStart(gameId: string, startTime: number): void;
  deleteTimeoutStart(gameId: string): void;
  cleanup(): void;
  getRoundTimeoutMs(): number;
}

export class WebSocketService implements IWebSocketService {
  private readonly ROUND_TIMEOUT_MS = 10000; // 10 seconds

  // Track timeout start times for sync across clients
  private timeoutStarts: Map<string, number> = new Map();

  // Store WebSocket instances for broadcasting
  private gameWebSockets: Map<string, Set<GameSocket>> = new Map();

  sendToClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    try {
      const data = JSON.stringify({ ...data_raw, op });
      ws.send(data);
    } catch (err) {
      try {
        ws.send(JSON.stringify({ err, message: "Error sending message", op: "error" }));
      } catch (_) {
        // ignore
      }
    }
  }

  broadcastToGameAndClient(ws: GameSocket, op: string, data_raw: object = {}): void {
    this.sendToClient(ws, op, data_raw);
    this.broadcastToGame(ws.data.game, op, data_raw);
  }

  publishToGame(ws: GameSocket, op: string, data_raw: object = {}): void {
    try {
      const data = JSON.stringify({ ...data_raw, op });
      ws.publish(ws.data.game, data);
    } catch (err) {
      this.sendToClient(ws, "error", { message: "Error publishing message", err });
    }
  }

  broadcastToGame(gameId: string, op: string, data: any): void {
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
      const payload = JSON.stringify({ ...data, op });
      wsAny.publish(gameId, payload);
    } catch (error) {
      console.error('[DEBUG] Error broadcasting to game:', error);
    }
  }

  handleDisconnect(ws: GameSocket, game: GameData): void {
    try {
      // Remove WebSocket instance
      const gameSockets = this.gameWebSockets.get(ws.data.game);
      if (gameSockets) {
        gameSockets.delete(ws);
        if (gameSockets.size === 0) {
          this.gameWebSockets.delete(ws.data.game);
        }
      }

      const player = game.players.find(p => p.id === ws.data.player);
      if (player) {
        player.connected = false;
      }
    } catch (error) {
      console.error("Error in handleDisconnect:", error);
    }
  }

  async handleReconnectStatus(ws: GameSocket): Promise<void> {
    try {
      // Server no longer performs reconnect attempts; always report not reconnecting
      this.sendToClient(ws, "reconnect_status", {
        reconnecting: false,
        attemptCount: 0,
        nextAttemptIn: 0,
      });
    } catch (error) {
      console.error("Error in handleReconnectStatus:", error);
      this.sendToClient(ws, "error", { message: "Failed to get reconnect status" });
    }
  }

  async handlePing(ws: GameSocket): Promise<void> {
    this.sendToClient(ws, "pong");
  }

  addWebSocket(gameId: string, ws: GameSocket): void {
    if (!this.gameWebSockets.has(gameId)) {
      this.gameWebSockets.set(gameId, new Set());
    }
    this.gameWebSockets.get(gameId)!.add(ws);
  }

  removeWebSocket(gameId: string, ws: GameSocket): void {
    const gameSockets = this.gameWebSockets.get(gameId);
    if (gameSockets) {
      gameSockets.delete(ws);
      if (gameSockets.size === 0) {
        this.gameWebSockets.delete(gameId);
      }
    }
  }

  hasWebSockets(gameId: string): boolean {
    const gameSockets = this.gameWebSockets.get(gameId);
    return gameSockets ? gameSockets.size > 0 : false;
  }

  getTimeoutStart(gameId: string): number | undefined {
    return this.timeoutStarts.get(gameId);
  }

  setTimeoutStart(gameId: string, startTime: number): void {
    this.timeoutStarts.set(gameId, startTime);
  }

  deleteTimeoutStart(gameId: string): void {
    this.timeoutStarts.delete(gameId);
  }

  cleanup(): void {
    this.gameWebSockets.clear();
    this.timeoutStarts.clear();
  }

  getRoundTimeoutMs(): number {
    return this.ROUND_TIMEOUT_MS;
  }
}