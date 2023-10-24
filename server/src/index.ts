import { PushEvent } from "@octokit/webhooks-types";
import { ingestEvent } from "./axiom";
import { Catagories, GameData } from "types";
import { client } from "redis_client";
import { GameSocket, SocketRouter, handle_incoming_message } from "lib/router";
import { emit, publish, send } from "lib/socket";
import { select_question } from "lib/questions";

const required_env_vars = [
  "GAME_DATA_DIR",
  "REDIS_URI",
  "AXIOM_TOKEN",
  "AXIOM_ORG_ID",
];

const missing_env_vars = required_env_vars.filter(
  (env_var) => !Object.keys(Bun.env).includes(env_var)
);

if (missing_env_vars.length > 0) {
  // prettier-ignore
  console.error(`[FATAL ERROR] Missing required environment variables: ${missing_env_vars.join(", ")}`);
  process.exit(1);
}

async function get_questions_list() {
  let questions_list = await client.json.GET("shared:questions_list");
  if (!questions_list) {
    const questions_list = await Bun.file(
      `${import.meta.dir}/../assets/data.json`
    ).json<Catagories>();
    await client.json.set("shared:questions_list", "$", questions_list);
  }

  return questions_list as Catagories;
}

function get_game(id: string) {
  const game = games.find((game) => game.id === id);
  if (!game) {
    return false;
  }
  return game;
}

function deepCopy(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error(e);
  }
}

const games: GameData[] = [];

// setup router
SocketRouter.route("join_game", player_join);
SocketRouter.route("select_catagories", select_catagories);
SocketRouter.route("select_catagory", select_catagory);
SocketRouter.route("confirm_selections", confirm_selection);
SocketRouter.route("next_question", next_question);
SocketRouter.route("reset_game", reset_game);
SocketRouter.route("vote", player_vote);
SocketRouter.route("ping", ping);

const server = Bun.serve({
  async fetch(req, server) {
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/": {
        const params = new URLSearchParams(req.url.split("?")[1]);

        if (!params.has("game") || !params.has("player")) {
          return new Response("Never Have I Ever", { status: 200 });
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
        return new Response("Never Have I Ever", { status: 200 });
      }
      case "/api/catagories": {
        const catagories = await get_questions_list();

        const response = Response.json(catagories);
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Cache-Control", "max-age=86400");
        return response;
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
        let { data: _, ...wo_data } = game;

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
    message: handle_incoming_message,
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

async function player_join(ws: GameSocket, data: any) {
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
    return send(ws, "error", { message: "Game not found" });
  }

  if (game.players.length > 12) {
    send(ws, "error", { message: "Game is full" });
    return ws.close(1013, "Game is full");
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
  current_player = game.players.find((player) => player.id === ws.data.player);

  if (current_player.connected === false) {
    current_player.connected = true;
  }

  ws.subscribe(ws.data.game);
  ws.subscribe("notifications");

  let { data: _, ...wo_data } = game;
  return emit(ws, ws.data.game, "game_state", {
    id: ws.data.game,
    game: wo_data,
  });
}
async function select_catagories(ws: GameSocket, data: any) {
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
  }
  ingestEvent({
    gameID: ws.data.game,
    event: "catagory_selection_started",
    playerID: ws.data.player,
  });

  game.catagory_select = true;

  let { data: _, history: __, ...wo_data } = game;
  return emit(ws, ws.data.game, "game_state", { game: wo_data });
}
async function select_catagory(ws: GameSocket, data: any) {
  if (!data.catagory) {
    return send(ws, "error", { message: "No catagory provided" });
  }
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
  }

  if (!game.catagories.find((catagory) => catagory === data.catagory)) {
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

  return publish(ws, ws.data.game, "", {
    op: "select_catagory",
    id: ws.data.game,
    catagory: data.catagory,
  });
}
async function confirm_selection(ws: GameSocket, data: any) {
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
  }

  if (game.catagories.length === 0) {
    return send(ws, "error", { message: "No catagories selected" });
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

  return emit(ws, ws.data.game, "game_state", { game });
}
async function next_question(ws: GameSocket, data: any) {
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
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
    game: game.game_completed ? { ...wo_data, history: game.history } : wo_data,
  });
  return emit(ws, ws.data.game, "new_round");
}
async function reset_game(ws: GameSocket, data: any) {
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
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
  return emit(ws, ws.data.game, "game_state", { game: wo_data });
}
async function player_vote(ws: GameSocket, data: any) {
  const game = get_game(ws.data.game);
  if (!game) {
    return send(ws, "error", { message: "Game not found" });
  }

  if (!data.option) {
    return send(ws, "error", { message: "No vote provided" });
  }

  const player = game.players.find((player) => player.id === ws.data.player);
  if (!player) {
    return send(ws, "error", { message: "Player not found" });
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
  return emit(ws, ws.data.game, "game_state", { game: wo_data });
}
async function ping(ws: GameSocket, data: any) {
  return send(ws, "pong");
}

/** Save Active Games
 * This saves the active games to the filesystem
 * every 5 seconds
 * This is so that if the server crashes, the games
 * can be recovered
 * This is not a replacement for a proper database
 * but it is a good enough solution for now
 */
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

// setInterval(() => {
//   console.info(
//     `[${new Date().toISOString()}][INFO] ${
//       games.filter((g) => {
//         return g.players.filter((p) => p.connected).length > 0;
//       }).length
//     } games active`
//   );
//   console.info(
//     `[${new Date().toISOString()}][INFO] ${rps} requests per second`
//   );
//   rps = 0;
// }, 1000);

console.log(`Server running at http://${server.hostname}:${server.port}/`);
