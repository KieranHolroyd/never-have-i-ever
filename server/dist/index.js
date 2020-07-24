"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var app = require("express");
var io = require("socket.io");
var logging_1 = require("./util/logging");
var constants_1 = require("./util/constants");
var cache = require("memory-cache");
var application = app();
var http_server = http.createServer(app);
var ws = io(http_server);
application.get("/", function (req, res) {
    logging_1.logger.info("User visits `/`");
    return res.send("Welcome to the never have i ever realtime-server");
});
http_server.listen(constants_1.PORT, function () {
    logging_1.logger.info("Webserver Started on http://localhost:" + constants_1.PORT);
});
ws.on("connection", function (socket) {
    cache.put(socket.id, Math.random() * 10000);
    logging_1.logger.info("Connected [" + socket.id + "]");
    socket.on("getcache", function () {
        var ms = cache.get(socket.id);
        logging_1.logger.info("Got cache message for " + socket.id + " " + ms);
        socket.emit("message", { message: ms });
    });
});
