import { ServerWebSocket } from "bun";
import { send } from "./socket";
import { ingestEvent } from "../axiom";
import { SafeJSON } from "../utils/json";
import { z } from "zod";
import { engineRegistry } from "./engine-registry";
import { createDefaultMiddlewarePipeline, WebSocketContext, WebSocketMiddlewarePipeline } from "../middleware";
import { GameManager } from "../game-manager";

export type GameSocketMetadata = {
  game: string;
  player: string;
  playing: string;
};

export type GameSocket = ServerWebSocket<GameSocketMetadata>;

export type HandlerFn = (ws: GameSocket, data: any) => Promise<void>;
export type SocketRouteHandlers = {
  [key: string]: HandlerFn;
};

// Schema for WebSocket messages
const WebSocketMessageSchema = z.object({
  op: z.string(),
}).passthrough();

export class SocketRouter {
  private static handlers: SocketRouteHandlers = {};
  private static middlewarePipeline: WebSocketMiddlewarePipeline | null = null;

  static setMiddlewarePipeline(pipeline: WebSocketMiddlewarePipeline) {
    this.middlewarePipeline = pipeline;
  }

  static async handle(ws: GameSocket, op: string, data: any, gameManager?: GameManager) {
    // Run middleware pipeline if configured
    if (this.middlewarePipeline && gameManager) {
      const context: WebSocketContext = { ws, data, gameManager };
      await this.middlewarePipeline.execute(context);
    }

    // First try to find engine-specific handler
    const engine = engineRegistry.get(ws.data.playing);
    if (engine && engine.handlers[op]) {
      await engine.handlers[op](ws, data);
      return;
    }

    // Fall back to global handlers
    if (this.handlers[op]) {
      await this.handlers[op](ws, data);
    } else {
      ingestEvent({
        gameID: ws.data.game,
        event: "invalid_operation",
        details: { operation: op }
      });
      send(ws, "error", {
        error: {
          code: "INVALID_OPERATION",
          message: `Unknown operation: ${op}`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async route(op: string, handler: HandlerFn) {
    this.handlers[op] = handler;
  }
}

export async function handle_incoming_message(
  ws: GameSocket,
  message: string | Buffer,
  gameManager?: GameManager
) {
  if (typeof message !== "string") {
    send(ws, "error", { message: "Invalid message" });
    return;
  }
  try {
    const data = SafeJSON.parse(message, WebSocketMessageSchema);
    const op = data.op;

    if (op !== "ping") {
      ingestEvent({
        event: "websocket_message_received",
        op,
        gameID: ws.data.game,
        player: ws.data.player,
        data,
      });
    }

    await SocketRouter.handle(ws, op, data, gameManager);
  } catch (err) {
    ingestEvent({
      gameID: ws.data.game,
      event: "websocket_message_error",
      playerID: ws.data.player,
      details: {
        message: message,
        error: err.message
      },
      errors: err,
    });
    send(ws, "error", {
      error: {
        code: "MESSAGE_PARSE_ERROR",
        message: "Failed to parse WebSocket message",
        details: { originalMessage: message.substring(0, 200) },
        timestamp: new Date().toISOString()
      }
    });
  }
}
