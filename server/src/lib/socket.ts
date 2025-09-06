import type { GameSocket } from "./router";

export function emit(
  ws: GameSocket | null,
  topic: string,
  op: string,
  data_raw: object = {}
) {
  try {
    const data = JSON.stringify({ ...data_raw, op });

    if (ws) {
      // Send to specific WebSocket and publish to topic
      ws.publish(topic, data);
      ws.send(data);
    } else {
      // Broadcast only to topic (when no specific WebSocket)
      // Note: This requires a WebSocket instance to publish
      // For now, we'll throw an error if no WebSocket is provided
      throw new Error("Cannot broadcast without WebSocket instance");
    }
  } catch (err) {
    if (ws) {
      ws.send(
        JSON.stringify({ err, message: "Error sending message", op: "error" })
      );
    }
    console.error("Emit error:", err);
  }
}

export function send(ws: GameSocket, op: string, data_raw: object = {}) {
  try {
    const data = JSON.stringify({ ...data_raw, op });

    ws.send(data);
  } catch (err) {
    ws.send(
      JSON.stringify({ err, message: "Error sending message", op: "error" })
    );
  }
}

export function publish(
  ws: GameSocket,
  topic: string,
  op: string,
  data_raw: object = {}
) {
  try {
    const data = JSON.stringify({ ...data_raw, op });

    ws.publish(topic, data);
  } catch (err) {
    ws.send(
      JSON.stringify({ err, message: "Error sending message", op: "error" })
    );
    return;
  }
}
