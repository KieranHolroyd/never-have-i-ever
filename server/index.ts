import { ServerWebSocket } from "bun";
import figlet from "figlet";
import { v4 } from "uuid";

function send(ws: ServerWebSocket<any>, prefix: string, data_raw: object) {
  try {
    const data = JSON.stringify(data_raw);
    ws.send(`${prefix};${data}`);
  } catch (err) {
    ws.send(`error;${JSON.stringify(err)}}`);
    return;
  }
}

function publish(
  ws: ServerWebSocket<any>,
  topic: string,
  prefix: string,
  data_raw: object
) {
  try {
    const data = JSON.stringify(data_raw);
    const to_send = prefix !== "" ? `${prefix};${data}` : `game;${data}`;
    ws.publish(topic, to_send);
  } catch (err) {
    ws.send(`error;${JSON.stringify(err)}}`);
    return;
  }
}

function get_game(id: string) {
  const game = games.find((game) => game.id === id);
  if (!game) {
    return false;
  }
  return game;
}

type GameData = {
  id: string;
  players: string[];

  catagoies: string[];
};
const games: GameData[] = [];

const server = Bun.serve({
  async fetch(req, server) {
    const params = new URLSearchParams(req.url.split("?")[1]);
    console.log(params);
    if (!params.has("game") || !params.has("player")) {
      return new Response(figlet.textSync("Never Have I Ever"));
    }
    const success = server.upgrade(req, {
      headers: {
        "X-Gameid": params.get("game"),
      },
      data: {
        game: params.get("game"),
        player: params.get("player"),
      },
    });
    if (success) {
      // Bun automatically returns a 101 Switching Protocols
      // if the upgrade succeeds
      return undefined;
    }

    // handle HTTP request normally
    return new Response(figlet.textSync("Never Have I Ever"));
  },
  websocket: {
    message: (
      ws: ServerWebSocket<{ game: string; player: string }>,
      message
    ) => {
      if (typeof message !== "string") {
        send(ws, "error", { message: "Invalid message" });
        return;
      }
      try {
        const op = message.split(";")[0];
        console.log(op);
        const data_raw = message.split(";")[1];
        const data = JSON.parse(data_raw);

        switch (op) {
          case "join_game": {
            if (data.create) {
              if (!games.find((game) => game.id === ws.data.game)) {
                games.push({
                  id: ws.data.game,
                  players: [ws.data.player],
                  catagoies: [],
                });
              }
            }
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            if (!game.players.find((player) => player === ws.data.player)) {
              game.players.push(ws.data.player);
            }

            ws.subscribe(ws.data.game);

            publish(ws, ws.data.game, "", {
              op: "join_game",
              id: ws.data.game,
              player: ws.data.player,
            });
            send(ws, "join_game", { id: ws.data.game, game });
          }
          case "select_catagory": {
            if (!data.catagory) {
              send(ws, "error", { message: "No catagory provided" });
              break;
            }
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            if (
              !game.catagoies.find((catagory) => catagory === data.catagory)
            ) {
              game.catagoies.push(data.catagory);
            } else {
              game.catagoies.splice(game.catagoies.indexOf(data.catagory), 1);
            }

            console.log(data.catagory);
            publish(ws, ws.data.game, "", {
              op: "select_catagory",
              id: ws.data.game,
              catagory: data.catagory,
            });
          }
          default: {
            send(ws, "error", { message: "Invalid operation" });
            break;
          }
        }
      } catch (err) {
        send(ws, "error", { error: err.message, err });
      }
    },
    open: (ws) => {
      console.log("Websocket connection opened");
      send(ws, "open", { message: "Websocket connection opened" });
    },
  },
  port: 3000,
});

console.log(`Server running at http://${server.hostname}:${server.port}/`);
