import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { users, userSessions, type User } from './auth-schema';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = 'session_id';
const SESSION_TTL_DAYS = 30;

// ── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const buf = (await scryptAsync(password, salt, 64)) as Buffer;
	return `${buf.toString('hex')}.${salt}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const [hashedPwd, salt] = hash.split('.');
	if (!hashedPwd || !salt) return false;
	const buf = (await scryptAsync(password, salt, 64)) as Buffer;
	const storedBuf = Buffer.from(hashedPwd, 'hex');
	return timingSafeEqual(buf, storedBuf);
}

// ── Session management ────────────────────────────────────────────────────────

export function generateSessionId(): string {
	return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
	const id = generateSessionId();
	const expires_at = new Date();
	expires_at.setDate(expires_at.getDate() + SESSION_TTL_DAYS);
	await db.insert(userSessions).values({ id, user_id: userId, expires_at });
	return id;
}

export async function getSessionUser(sessionId: string): Promise<User | null> {
	if (!sessionId) return null;
	const rows = await db
		.select({ user: users })
		.from(userSessions)
		.innerJoin(users, eq(userSessions.user_id, users.id))
		.where(and(eq(userSessions.id, sessionId), gt(userSessions.expires_at, new Date())))
		.limit(1);
	return rows[0]?.user ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
	await db.delete(userSessions).where(eq(userSessions.id, sessionId));
}

// ── User operations ───────────────────────────────────────────────────────────

export async function createUser(
	email: string,
	password: string,
	nickname: string
): Promise<User> {
	const password_hash = await hashPassword(password);
	const [user] = await db
		.insert(users)
		.values({ email: email.toLowerCase().trim(), password_hash, nickname })
		.returning();
	return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase().trim()))
		.limit(1);
	return user ?? null;
}

export async function updateNickname(userId: string, nickname: string): Promise<void> {
	await db
		.update(users)
		.set({ nickname, updated_at: new Date() })
		.where(eq(users.id, userId));
}

export async function updateEmail(userId: string, email: string): Promise<void> {
	await db
		.update(users)
		.set({ email: email.toLowerCase().trim(), updated_at: new Date() })
		.where(eq(users.id, userId));
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
	const password_hash = await hashPassword(newPassword);
	await db
		.update(users)
		.set({ password_hash, updated_at: new Date() })
		.where(eq(users.id, userId));
}

export { SESSION_COOKIE };
