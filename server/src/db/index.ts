import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { join } from "path";
import * as schema from "./schema";

export const DB_PATH = join(import.meta.dir, "../../assets/db.sqlite");

const sqlite = new Database(DB_PATH, { create: true });
export const db = drizzle(sqlite, { schema });
