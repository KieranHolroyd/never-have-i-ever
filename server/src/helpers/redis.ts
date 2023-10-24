import type { GameData, Player } from "types";
import { client } from "./redis_client";

type RedisGameKeyTypes = [
  "game",
  "player",
  "players",
  "catagories",
  "data",
  "history",
  "current_question",
  "game_completed"
];
type OptionalRedisArgs = {
  gameid: string;
  playerid?: string;
};
// -- Get Item --
// Overload signatures
/* prettier-ignore */ export async function get_item(type: "game", args: OptionalRedisArgs): Promise<GameData>;
/* prettier-ignore */ export async function get_item(type: "player", args: OptionalRedisArgs): Promise<Player>;
/* prettier-ignore */ export async function get_item(type: "players", args: OptionalRedisArgs): Promise<Array<Player>>;

// Implementation
export async function get_item(
  type: RedisGameKeyTypes[number],
  args: OptionalRedisArgs
) {
  try {
    if (type === "game") {
      return (await client.json.get(`games:nhie:${args.gameid}`)) as GameData;
    }

    if (type === "player") {
      return JSON.parse(
        await client.hGet(`games:nhie:${args.gameid}:players`, args.playerid)
      ) as Player;
    }

    if (type === "players") {
      const players = await client.hGetAll(`games:nhie:${args.gameid}:players`);
      return Object.values(players).map((p) => JSON.parse(p)) as Array<Player>;
    }

    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

//-- Set Item --
// Overload signatures
/* prettier-ignore */ export async function set_item(type: "game", args: OptionalRedisArgs, value: GameData): Promise<void>;
/* prettier-ignore */ export async function set_item(type: "player", args: OptionalRedisArgs, value: Player): Promise<void>;

// Implementation
export async function set_item(
  type: RedisGameKeyTypes[number],
  args: OptionalRedisArgs,
  value: GameData | Player
): Promise<void> {
  try {
    if (type === "game") {
      await client.json.SET(`games:nhie:${args.gameid}`, "$", value);
    }

    if (type === "player") {
      await client.hSet(
        `games:nhie:${args.gameid}:players`,
        args.playerid,
        JSON.stringify(value)
      );
    }
  } catch (e) {
    console.error(e);
  }
}

export async function setgame(id: string, game: GameData) {
  return await client.json.SET(`games:nhie:${id}`, "$", game);
}
