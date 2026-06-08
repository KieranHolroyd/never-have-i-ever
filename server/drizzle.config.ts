import type { Config } from "drizzle-kit";
import { loadDrizzleEnv } from "./drizzle-env";

const mode = loadDrizzleEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL is not set. Create server/.env.${mode === "production" ? "production" : "local"} ` +
      `(see server/.env.${mode === "production" ? "production" : "local"}.example).`,
  );
}

export default {
  schema: "../packages/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
