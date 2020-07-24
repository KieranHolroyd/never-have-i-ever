import * as pino from "pino";
export const logger = pino({
  prettyPrint: { colorize: true, translateTime: "HH:MM:ss.l" },
});
