import { ServerWebSocket } from "bun";
import figlet from "figlet";
import { v4 } from "uuid";
import * as game_data from "./data.json";

function send(ws: ServerWebSocket<any>, prefix: string, data_raw: object) {
  try {
    data_raw["op"] = prefix;
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

function select_question(game: GameData) {
  const sel_cat =
    game.catagories[Math.floor(Math.random() * (game.catagories.length - 1))];

  const sel_question = chooseQuestionFromCatagory(sel_cat, game);

  if (sel_question === undefined && game.catagories.length === 1) {
    game.game_completed = true;
  } else if (sel_question === undefined && game.catagories.length >= 1) {
    game.catagories.splice(game.catagories.indexOf(sel_cat), 1);
  }

  return { catagory: sel_cat, content: sel_question };
}

function chooseQuestionFromCatagory(catagory: string, game: GameData) {
  const rand_number =
    Math.floor(Math.random() * (game.data[catagory].length - 1)) + 1;
  let q = game.data[catagory][rand_number];
  game.data[catagory].splice(rand_number, 1);
  return q;
}

type GameData = {
  id: string;
  players: string[];

  catagories: string[];

  current_question: {
    catagory: string;
    content: string;
  };

  // Control States
  catagory_select: boolean;
  game_completed: boolean;

  // Local game state
  data: any;
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
                  catagories: [],
                  catagory_select: true,
                  game_completed: false,
                  current_question: { catagory: "", content: "" },
                  data: { ...game_data }, // This is a copy of the data
                  // so that we can remove questions from it
                  // a better way to do this would be to have a
                  // mask on the data that is removed as questions
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
            send(ws, "game_state", { game });
            send(ws, "join_game", { id: ws.data.game, game });
            break;
          }
          case "select_catagories": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.catagory_select = true;
            publish(ws, ws.data.game, "", {
              op: "game_state",
              game,
            });
            send(ws, "game_state", { game });
            break;
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
              !game.catagories.find((catagory) => catagory === data.catagory)
            ) {
              game.catagories.push(data.catagory);
            } else {
              game.catagories.splice(game.catagories.indexOf(data.catagory), 1);
            }

            publish(ws, ws.data.game, "", {
              op: "select_catagory",
              id: ws.data.game,
              catagory: data.catagory,
            });
            break;
          }
          case "confirm_selections": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.catagory_select = false;

            publish(ws, ws.data.game, "", {
              op: "game_state",
              game,
            });
            send(ws, "game_state", { game });
            break;
          }
          case "next_question": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.current_question = select_question(game);

            publish(ws, ws.data.game, "", {
              op: "game_state",
              game,
            });
            send(ws, "game_state", { game });
            break;
          }
          case "reset_game": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.catagories = [];
            game.catagory_select = true;
            game.game_completed = false;
            game.current_question = { catagory: "", content: "" };
            game.data = { ...game_data };

            publish(ws, ws.data.game, "", {
              op: "game_state",
              game,
            });
            send(ws, "game_state", { game });
            break;
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
