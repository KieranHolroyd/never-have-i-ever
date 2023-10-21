import { createClient } from "redis";

export const client = await createClient({
  url: Bun.env.REDIS_URI,
})
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();
