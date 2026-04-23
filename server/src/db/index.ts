import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = Bun.env.DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost:5432/nhie";

const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export async function closeDatabasePool(): Promise<void> {
  await client.end();
}
