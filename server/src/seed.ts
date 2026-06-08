import { loadDrizzleEnv } from "../drizzle-env";

const mode = loadDrizzleEnv();
const force = process.argv.includes("--force");

const { runSeed } = await import("./seed/run.ts");

try {
	await runSeed({ mode, force });
} catch (error) {
	console.error("[seed] Failed:", error);
	process.exit(1);
}
