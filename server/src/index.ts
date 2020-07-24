import * as http from "http";
import * as app from "express";
import * as io from "socket.io";
import { logger } from "./util/logging";
import { PORT } from "./util/constants";
import * as cache from "memory-cache";

const application = app();
const http_server = http.createServer(app);
const ws = io(http_server);

application.get("/", (req, res) => {
  logger.info("User visits `/`");
  return res.send("Welcome to the never have i ever realtime-server");
});

http_server.listen(PORT, () => {
  logger.info(`Webserver Started on http://localhost:${PORT}`);
});

ws.on("connection", (socket) => {
  cache.put(socket.id, Math.random() * 10000);
  logger.info(`Connected [${socket.id}]`);
  socket.on("getcache", () => {
    const ms = cache.get(socket.id);
    logger.info(`Got cache message for ${socket.id} ${ms}`);
    socket.emit("message", { message: ms });
  });
});
