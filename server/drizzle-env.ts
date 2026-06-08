import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));

const ENV_FILES = {
  local: ".env.local",
  production: ".env.production",
} as const;

type DrizzleEnv = keyof typeof ENV_FILES;

function parseEnvFile(path: string): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

/** Load DATABASE_URL (and other vars) for drizzle-kit from the active env file. */
export function loadDrizzleEnv(): DrizzleEnv {
  const mode: DrizzleEnv =
    process.env.DRIZZLE_ENV === "production" ? "production" : "local";
  const file = ENV_FILES[mode];
  const path = resolve(serverDir, file);

  if (existsSync(path)) {
    parseEnvFile(path);
    return mode;
  }

  // Backwards compatibility with server/.env
  parseEnvFile(resolve(serverDir, ".env"));
  return mode;
}
