import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const client = postgres(env.DATABASE_URL ?? 'postgresql://localhost:5432/nhie');

export const db = drizzle(client);
