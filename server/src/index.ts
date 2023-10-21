import { ServerWebSocket } from "bun";
import Database from "bun:sqlite";
import figlet from "figlet";
import { pickRandom } from "mathjs";
import { migrate } from "./migrate";
import { PushEvent } from "@octokit/webhooks-types";
import axiom, { ingestEvent } from "./axiom";
import { Catagories, GameData } from "types";

const required_env_vars = ["GAME_DATA_DIR", "AXIOM_TOKEN", "AXIOM_ORG_ID"];

const missing_env_vars = required_env_vars.filter(
  (env_var) => !Object.keys(Bun.env).includes(env_var)
);

if (missing_env_vars.length > 0) {
  console.error(
    `[FATAL ERROR] Missing required environment variables: ${missing_env_vars.join(
      ", "
    )}`
  );
  process.exit(1);
}

const db = new Database(`${Bun.env.GAME_DATA_DIR}db.sqlite`);

let local_questions_list: string = null;
async function get_questions_list() {
  if (!local_questions_list) {
    const questions_list = await Bun.file(
      `${import.meta.dir}/../assets/data.json`
    ).text();
    local_questions_list = questions_list;
  }

  return JSON.parse(local_questions_list) as Catagories;
}

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

function send(ws: ServerWebSocket<any>, op: string, data_raw: object = {}) {
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
  let q = pickRandom(game.data[catagory].questions);
  game.data[catagory].questions.splice(
    game.data[catagory].questions.indexOf(q),
    1
  );
  return q;
}

function deepCopy(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error(e);
  }
}

const games: GameData[] = [];

// console.log(db.query("SELECT * FROM catagories").all());

const server = Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/": {
        const params = new URLSearchParams(req.url.split("?")[1]);

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
        const catagories = await get_questions_list();

        const response = Response.json(catagories);
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Cache-Control", "max-age=86400");
        return response;
      }
      case "/api/catagories/db": {
        const catagories = db.query("SELECT * FROM catagories").all();
        return Response.json(catagories);
      }
      case "/api/game": {
        const gameid = url.searchParams.get("id");

        if (gameid === null) {
          return new Response(JSON.stringify({ error: "no_gameid" }), {
            status: 400,
          });
        }

        const game = get_game(gameid);
        if (!game) {
          return new Response(JSON.stringify({ error: "game_not_found" }), {
            status: 404,
          });
        }
        let { data: _, history: __, ...wo_data } = game;

        return new Response(
          JSON.stringify({
            ...wo_data,
            active: game.players.filter((p) => p.connected).length > 0,
          }),
          { status: 200 }
        );
      }
      case "/hook/github": {
        const CLIENT_UPDATE_DELAY = 30000; // ms
        const body = (await req.json()) as PushEvent;

        if (body.ref !== "refs/heads/master") {
          return new Response("Not main branch, ignoring", { status: 200 });
        }

        server.publish(
          "notifications",
          JSON.stringify({
            delay: CLIENT_UPDATE_DELAY,
            notification: "An update is available, please reload the page.",
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

        if (op !== "ping") {
          ingestEvent({
            event: "websocket_message_received",
            op,
            gameID: ws.data.game,
            player: ws.data.player,
            data,
          });
        }

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
                    ingestEvent({
                      event: "game_created",
                      gameID: ws.data.game,
                      loaded_from_filesystem: true,
                    });
                  } catch (e) {
                    send(ws, "error", { message: "Game data is invalid" });
                    ingestEvent({
                      event: "game_created_failed",
                      gameID: ws.data.game,
                      loaded_from_filesystem: true,
                      message: "Game data is invalid",
                      error: e,
                    });
                  }
                } else {
                  // Create a new game
                  const questions_list = await get_questions_list();
                  games.push({
                    id: ws.data.game,
                    players: [],
                    catagories: [],
                    catagory_select: true,
                    game_completed: false,
                    current_question: { catagory: "", content: "" },
                    history: [],
                    data: { ...questions_list }, // This is a copy of the data
                    // so that we can remove questions from it
                    // a better way to do this would be to have a
                    // mask on the data that is removed as questions
                  });
                  ingestEvent({
                    gameID: ws.data.game,
                    event: "game_created",
                    loaded_from_filesystem: false,
                  });
                }
              }
            }
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            if (game.players.length > 12) {
              send(ws, "error", { message: "Game is full" });
              ws.close(1013, "Game is full");
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
              ingestEvent({
                gameID: ws.data.game,
                event: "player_joined",
                playerID: ws.data.player,
                details: {
                  name: data.playername,
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

            let { data: _, ...wo_data } = game;
            emit(ws, ws.data.game, "game_state", {
              id: ws.data.game,
              game: wo_data,
            });
            break;
          }
          case "select_catagories": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }
            ingestEvent({
              gameID: ws.data.game,
              event: "catagory_selection_started",
              playerID: ws.data.player,
            });

            game.catagory_select = true;

            let { data: _, history: __, ...wo_data } = game;
            emit(ws, ws.data.game, "game_state", { game: wo_data });
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
            ingestEvent({
              gameID: ws.data.game,
              event: "catagory_selected",
              playerID: ws.data.player,
              details: {
                catagory: data.catagory,
              },
            });

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

            if (game.catagories.length === 0) {
              send(ws, "error", { message: "No catagories selected" });
              break;
            }

            ingestEvent({
              gameID: ws.data.game,
              event: "catagory_selection_completed",
              playerID: ws.data.player,
              details: {
                selected_catagories: game.catagories,
              },
            });

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

            ingestEvent({
              gameID: ws.data.game,
              event: "vote_completed",
              details: {
                question: game.current_question,
              },
            });

            // Add round to history
            if (game.history === undefined) game.history = [];
            if (game.current_question.catagory !== "")
              game.history.push({
                question: game.current_question,
                players: deepCopy(game.players),
              });

            game.current_question = select_question(game);
            game.players.forEach((player) => {
              player.this_round.vote = null;
              player.this_round.voted = false;
            });
            ingestEvent({
              gameID: ws.data.game,
              event: "next_question",
              playerID: ws.data.player,
              details: {
                question: game.current_question,
              },
            });

            let { data: _, history: __, ...wo_data } = game;
            emit(ws, ws.data.game, "game_state", {
              game: game.game_completed
                ? { ...wo_data, history: game.history }
                : wo_data,
            });
            emit(ws, ws.data.game, "new_round", {});
            break;
          }
          case "reset_game": {
            const game = get_game(ws.data.game);
            if (!game) {
              send(ws, "error", { message: "Game not found" });
              break;
            }

            ingestEvent({
              gameID: ws.data.game,
              event: "game_reset",
              playerID: ws.data.player,
              details: {
                final_state: game,
              },
            });
            game.catagories = [];
            game.history = [];
            game.catagory_select = true;
            game.game_completed = false;
            game.current_question = { catagory: "", content: "" };
            game.players.forEach((player) => {
              player.score = 0;
              player.this_round.vote = null;
              player.this_round.voted = false;
            });
            const game_data = await get_questions_list();

            game.data = { ...game_data };

            let { data: _, history: __, ...wo_data } = game;
            emit(ws, ws.data.game, "game_state", { game: wo_data });

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
            ingestEvent({
              gameID: ws.data.game,
              event: "vote_cast",
              playerID: ws.data.player,
              details: {
                vote: data.option,
                vote_str: player.this_round.vote,
              },
            });

            let { data: _, history: __, ...wo_data } = game;
            emit(ws, ws.data.game, "game_state", { game: wo_data });
            break;
          }
          case "ping": {
            send(ws, "pong");
            break;
          }
          default: {
            ingestEvent({
              gameID: ws.data.game,
              event: "invalid_operation",
            });
            send(ws, "error", { message: "Invalid operation" });
            break;
          }
        }
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
    },
    open: (ws) => {
      ingestEvent({
        event: "websocket_connection_opened",
        playerID: ws.data.player,
      });
      send(ws, "open", { message: "Websocket connection opened" });
    },
    close: (ws) => {
      const game = get_game(ws.data.game);
      if (!game) return;

      const plyr = game.players.find((p) => p.id === ws.data.player);
      plyr.connected = false;

      ingestEvent({
        event: "websocket_connection_closed",
        playerID: ws.data.player,
      });

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

    const current_file = Bun.file(`${Bun.env.GAME_DATA_DIR}${filename}`);
    if (await current_file.exists()) {
      const current_game = await current_file.text();
      if (current_game === JSON.stringify(game)) return;
    }

    await Bun.write(
      `${Bun.env.GAME_DATA_DIR}${filename}`,
      JSON.stringify(game)
    );

    ingestEvent({
      event: "game_state_saved",
      gameID: game.id,
    });
  });
}, 5000);

console.log(`Server running at http://${server.hostname}:${server.port}/`);
