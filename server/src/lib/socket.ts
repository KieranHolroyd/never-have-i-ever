import type { GameSocket } from "./router";

export function emit(
  ws: GameSocket,
  topic: string,
  op: string,
  data_raw: object = {}
) {
  try {
    const data = JSON.stringify({ ...data_raw, op });
    ws.publish(topic, data);
    ws.send(data);
  } catch (err) {
    ws.send(
      JSON.stringify({ err, message: "Error sending message", op: "error" })
    );
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
