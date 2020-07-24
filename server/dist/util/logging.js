"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var pino = require("pino");
exports.logger = pino({
    prettyPrint: { colorize: true, translateTime: "HH:MM:ss.l" },
});
