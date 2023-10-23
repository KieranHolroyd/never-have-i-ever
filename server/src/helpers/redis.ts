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

// Overload signatures
/* prettier-ignore */ export async function get_item(type: "game", args: OptionalRedisArgs): Promise<GameData>;
/* prettier-ignore */ export async function get_item(type: "player", args: OptionalRedisArgs): Promise<Player>;

// Implementation
export async function get_item(
  type: RedisGameKeyTypes[number],
  args: OptionalRedisArgs
): Promise<GameData | Player | null> {
  try {
    if (type === "game") {
      return JSON.parse(
        await client.GET(`games:nhie:${args.gameid}`)
      ) as GameData;
    }

    if (type === "player") {
      return JSON.parse(
        await client.hGet(`games:nhie:${args.gameid}:players`, args.playerid)
      ) as Player;
    }

    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
export async function setgame(id: string, game: GameData) {
  return await client.json.SET(`games:nhie:${id}`, "$", game);
}
