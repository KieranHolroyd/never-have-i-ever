import { ServerWebSocket } from "bun";
import Database from "bun:sqlite";
import figlet from "figlet";
import { pickRandom } from "mathjs";
import { migrate } from "./migrate";
import { PushEvent, WebhookEvent } from "@octokit/webhooks-types";
import { WebSocket } from "ws";

if (!Bun.env.GAME_DATA_DIR) {
  console.error(
    "[FATAL ERROR] Environment Variable GAME_DATA_DIR isn't defined"
  );
  process.exit(1);
}

const db = new Database(Bun.env.GAME_DATA_DIR + "db.sqlite");

// TAKEN FROM ../client/src/lib/types.ts
export enum VoteOptions {
  Have = 1,
  HaveNot = 2,
  Kinda = 3,
}

export type Player = {
  id: string;
  name: string;
  score: number;

  this_round: {
    vote: string;
    voted: boolean;
  };
  connected: boolean;
};
//--------

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
  const sel_cat = pickRandom(game.catagories);

  const sel_question = chooseQuestionFromCatagory(sel_cat, game);

  if (sel_question === undefined && game.catagories.length === 1) {
    game.game_completed = true;
  } else if (sel_question === undefined && game.catagories.length >= 1) {
    game.catagories.splice(game.catagories.indexOf(sel_cat), 1);
    return select_question(game);
  }

  return { catagory: sel_cat, content: sel_question };
}

function chooseQuestionFromCatagory(catagory: string, game: GameData) {
  let q = pickRandom(game.data[catagory]);
  game.data[catagory].splice(game.data[catagory].indexOf(q), 1);
  return q;
}

type GameData = {
  id: string;
  players: Player[];

  catagories: string[];

  current_question: {
    catagory: string;
    content: string;
  };

  // Control States
  catagory_select: boolean;
  game_completed: boolean;

  // Local game state
  data: {
    [key: string]: string[];
  };
};
const games: GameData[] = [];

// console.log(db.query("SELECT * FROM catagories").all());

const server = Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/": {
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
      }
      case "/api/catagories": {
        const catagories = db.query("SELECT * FROM catagories").all();
        return Response.json(catagories);
      }
      case "/hook/github": {
        const CLIENT_UPDATE_DELAY = 30000; // ms
        const body = await req.json<PushEvent>();

        if (body.ref !== "refs/heads/main") {
          return new Response("Not main branch, ignoring", { status: 200 });
        }

        server.publish(
          "notifications",
          JSON.stringify({
            delay: CLIENT_UPDATE_DELAY,
            notification: "An update has been pushed, please reload the page.",
            op: "github_push",
          })
        );
        return new Response("OK", { status: 200 });
      }
      default: {
        return new Response("Not found", { status: 404 });
      }
    }
  },
  websocket: {
    message: async (
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
                const game_filehandler = Bun.file(
                  `${Bun.env.GAME_DATA_DIR}${ws.data.game}.json`
                );

                if (await game_filehandler.exists()) {
                  // Load game data from file
                  try {
                    const game_data = await game_filehandler.json();
                    games.push(game_data);
                  } catch {
                    send(ws, "error", { message: "Game data is invalid" });
                  }
                } else {
                  // Create a new game
                  const questions_list = await Bun.file("data.json").json();
                  games.push({
                    id: ws.data.game,
                    players: [],
                    catagories: [],
                    catagory_select: true,
                    game_completed: false,
                    current_question: { catagory: "", content: "" },
                    data: { ...questions_list }, // This is a copy of the data
                    // so that we can remove questions from it
                    // a better way to do this would be to have a
                    // mask on the data that is removed as questions
                  });
                }
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
              game.players.push({
                id: ws.data.player,
                name: data.playername,
                score: 0,
                connected: true,
                this_round: {
                  vote: null,
                  voted: false,
                },
              });
            }
            current_player = game.players.find(
              (player) => player.id === ws.data.player
            );

            if (current_player.connected === false) {
              current_player.connected = true;
            }

            ws.subscribe(ws.data.game);
            ws.subscribe("notifications");

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
              player.this_round.vote = null;
              player.this_round.voted = false;
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
            game.players.forEach((player) => {
              player.score = 0;
              player.this_round.vote = null;
              player.this_round.voted = false;
            });
            const game_data = await Bun.file("data.json").json();

            game.data = { ...game_data };

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
            // Change vote logic
            if (player.this_round.voted) {
              switch (player.this_round.vote) {
                case "Have": {
                  player.score -= 1;
                  break;
                }
                case "Have Not": {
                  break;
                }
                case "Kinda": {
                  player.score -= 0.5;
                  break;
                }
                default:
                  break;
              }
              player.this_round.voted = false;
            }
            // ---
            if (data.option === 1 && !player.this_round.voted) {
              player.score++;
              emit(ws, ws.data.game, "vote_cast", {
                player,
                vote: "Have",
              });
              player.this_round = { vote: "Have", voted: true };
            }
            if (data.option === 2 && !player.this_round.voted) {
              emit(ws, ws.data.game, "vote_cast", {
                player,
                vote: "Have Not",
              });
              player.this_round = { vote: "Have Not", voted: true };
            }
            if (data.option === 3 && !player.this_round.voted) {
              player.score += 0.5;
              emit(ws, ws.data.game, "vote_cast", {
                player,
                vote: "Kinda",
              });
              player.this_round = { vote: "Kinda", voted: true };
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

if (Bun.env.MIGRATE) {
  migrate(db);
}

setInterval(() => {
  games.map(async (game) => {
    if (game.players.filter((p) => p.connected).length === 0) return;

    const filename = `${game.id}.json`;
    await Bun.write(Bun.env.GAME_DATA_DIR + filename, JSON.stringify(game));
  });
}, 10000);

console.log(`Server running at http://${server.hostname}:${server.port}/`);
