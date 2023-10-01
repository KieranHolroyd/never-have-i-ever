import figlet from "figlet";
import { v4 } from "uuid";

const server = Bun.serve({
  fetch(req, server) {
    const success = server.upgrade(req, {
      headers: {
        "Set-Cookie": `SessionId=${v4()}`,
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
    message: (ws, message) => {
      if (typeof message !== "string") {
        ws.send('server, {err: "Invalid message"}');
        return;
      }
      try {
        const op = message.split(",")[0];
        const data_raw = message.split(",")[1];
        console.log(data_raw);
        const data = JSON.parse(data_raw);

        switch (op) {
          case "open_game": {
            // const game = games.find(game => game.id === data.game_id);
            // if (!game) return ws.send(`server: {err: "Game not found"}`);
            // game.players.push(data.player);
            ws.send(`${data.id}, {op: "open_game", data: {status: "success"}}`);
            return;
          }
          default: {
            ws.send(`${data.id}, {err: "Invalid operation"}`);
            return;
          }
        }
      } catch (err) {
        ws.send(`unknwn, {err: "${err.message}"}`);
      }
    },
    open: (ws) => {
      console.log("Websocket connection opened");
      ws.send("Hello from server");
    },
  },
  port: 3000,
});

console.log(`Server running at http://${server.hostname}:${server.port}/`);
