import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from '@nhie/db/schema';
import * as relations from '@nhie/db/relations';

const client = postgres(env.DATABASE_URL ?? 'postgresql://localhost:5432/nhie', {
	max: 10,
	idle_timeout: 30,
	connect_timeout: 10,
	// Required for PgBouncer/Neon pooler in transaction mode (e.g. Vercel serverless).
	prepare: false,
});

export const db = drizzle(client, { schema: { ...schema, ...relations } });
