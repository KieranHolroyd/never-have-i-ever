import { ServerWebSocket } from "bun";
import { send } from "./socket";
import { ingestEvent } from "../axiom";

export type GameSocketMetadata = {
  game: string;
  player: string;
};

export type GameSocket = ServerWebSocket<GameSocketMetadata>;

export type HandlerFn = (ws: GameSocket, data: any) => Promise<void>;
export type SocketRouteHandlers = {
  [key: string]: HandlerFn;
};

export class SocketRouter {
  private static handlers: SocketRouteHandlers = {};

  static async handle(ws: GameSocket, op: string, data: any) {
    if (this.handlers[op]) {
      await this.handlers[op](ws, data);
    } else {
      ingestEvent({
        gameID: ws.data.game,
        event: "invalid_operation",
      });
      send(ws, "error", { message: "Invalid operation" });
    }
  }

  static async route(op: string, handler: HandlerFn) {
    this.handlers[op] = handler;
  }
}

export async function handle_incoming_message(
  ws: GameSocket,
  message: string | Buffer
) {
  if (typeof message !== "string") {
    send(ws, "error", { message: "Invalid message" });
    return;
  }
  try {
    const data = JSON.parse(message);
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

    await SocketRouter.handle(ws, op, data);
  } catch (err) {
    ingestEvent({
      gameID: ws.data.game,
      event: "websocket_message_error",
      playerID: ws.data.player,
      details: {
        message: message,
      },
      errors: err,
    });
    send(ws, "error", { message: err.message, err });
  }
}
