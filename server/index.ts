import { ServerWebSocket } from "bun";
import figlet from "figlet";
import { v4 } from "uuid";
import * as game_data from "./data.json";

function emit(
  ws: ServerWebSocket<any>,
  topic: string,
  op: string,
  data_raw: object
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

function send(ws: ServerWebSocket<any>, op: string, data_raw: object) {
  try {
    const data = JSON.stringify({ ...data_raw, op });

    ws.send(data);
  } catch (err) {
    ws.send(
      JSON.stringify({ err, message: "Error sending message", op: "error" })
    );
  }
}

function publish(
  ws: ServerWebSocket<any>,
  topic: string,
  op: string,
  data_raw: object
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
  const rand_number = Math.floor(
    Math.random() * (game.data[catagory].length - 1)
  );
  let q = game.data[catagory][rand_number];
  game.data[catagory].splice(rand_number, 1);
  return q;
}

type GameData = {
  id: string;
  players: {
    id: string;
    name: string;
    score: number;

    connected: boolean;
    voted_this_round: boolean;
  }[];

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
        const data = JSON.parse(message);
        const op = data.op;

        switch (op) {
          case "join_game": {
            if (data.create) {
              if (!games.find((game) => game.id === ws.data.game)) {
                games.push({
                  id: ws.data.game,
                  players: [],
                  catagories: [],
                  catagory_select: true,
                  game_completed: false,
                  current_question: { catagory: "", content: "" },
                  data: Object.assign({}, game_data), // This is a copy of the data
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

            let current_player = game.players.find(
              (player) => player.id === ws.data.player
            );
            if (!current_player) {
              const playeridx = game.players.push({
                id: ws.data.player,
                name: data.playername,
                score: 0,
                connected: true,
                voted_this_round: false,
              });
              current_player = game.players[playeridx];
            }

            if (current_player.connected === false) {
              current_player.connected = true;
            }

            ws.subscribe(ws.data.game);

            emit(ws, ws.data.game, "game_state", {
              id: ws.data.game,
              game,
            });
            break;
          }
          case "select_catagories": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.catagory_select = true;
            emit(ws, ws.data.game, "game_state", { game });
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

            emit(ws, ws.data.game, "game_state", { game });
            break;
          }
          case "next_question": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            game.current_question = select_question(game);
            game.players.forEach((player) => {
              player.voted_this_round = false;
            });

            emit(ws, ws.data.game, "game_state", { game });
            emit(ws, ws.data.game, "new_round", {});
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
            game.data = Object.assign({}, game_data);

            emit(ws, ws.data.game, "game_state", { game });
            break;
          }
          case "vote": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            if (!data.option) {
              send(ws, "error", { message: "No vote provided" });
              break;
            }

            console.log(data.option, ws.data.player);
            const player = game.players.find(
              (player) => player.id === ws.data.player
            );
            if (!player) {
              send(ws, "error", { message: "Player not found" });
              break;
            }
            if (data.option === 1 && !player.voted_this_round) {
              player.score++;
              emit(ws, ws.data.game, "vote_cast", {
                player,
                vote: "Have",
              });
              player.voted_this_round = true;
            }
            if (data.option === 2 && !player.voted_this_round) {
              emit(ws, ws.data.game, "vote_cast", {
                player,
                vote: "Have Not",
              });
              player.voted_this_round = true;
            }

            emit(ws, ws.data.game, "game_state", { game });
            break;
          }
          default: {
            send(ws, "error", { message: "Invalid operation" });
            break;
          }
        }
      } catch (err) {
        send(ws, "error", { message: err.message, err });
      }
    },
    open: (ws) => {
      send(ws, "open", { message: "Websocket connection opened" });
    },
    close: (ws) => {
      const game = get_game(ws.data.game);
      if (!game) return;

      const plyr = game.players.find((p) => p.id === ws.data.player);
      plyr.connected = false;

      publish(ws, ws.data.game, "", {
        op: "game_state",
        game,
      });
    },
  },
  port: 3000,
});

console.log(`Server running at http://${server.hostname}:${server.port}/`);
