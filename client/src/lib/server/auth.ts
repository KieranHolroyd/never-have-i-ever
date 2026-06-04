import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import {
	users,
	userSessions,
	authTokens,
	googleAccounts,
	userCoreColumns,
	withDefaultPreferences,
	type User
} from './auth-schema';
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
		.select(userCoreColumns)
		.from(userSessions)
		.innerJoin(users, eq(userSessions.user_id, users.id))
		.where(and(eq(userSessions.id, sessionId), gt(userSessions.expires_at, new Date())))
		.limit(1);
	const row = rows[0];
	return row ? withDefaultPreferences(row) : null;
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
	const [row] = await db
		.insert(users)
		.values({ email: email.toLowerCase().trim(), password_hash, nickname })
		.returning(userCoreColumns);
	return withDefaultPreferences(row);
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const [row] = await db
		.select(userCoreColumns)
		.from(users)
		.where(eq(users.email, email.toLowerCase().trim()))
		.limit(1);
	return row ? withDefaultPreferences(row) : null;
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

// ── Auth tokens (password reset / email verification) ─────────────────────────

const TOKEN_TTL: Record<string, number> = {
	password_reset: 60 * 60 * 1000,        // 1 hour
	email_verification: 24 * 60 * 60 * 1000, // 24 hours
};

export async function createAuthToken(
	userId: string,
	type: 'password_reset' | 'email_verification'
): Promise<string> {
	// Invalidate any existing tokens of the same type for this user
	await db
		.delete(authTokens)
		.where(and(eq(authTokens.user_id, userId), eq(authTokens.type, type)));

	const id = randomBytes(32).toString('hex');
	const expires_at = new Date(Date.now() + TOKEN_TTL[type]);
	await db.insert(authTokens).values({ id, user_id: userId, type, expires_at });
	return id;
}

export async function consumeAuthToken(
	token: string,
	type: 'password_reset' | 'email_verification'
): Promise<User | null> {
	const rows = await db
		.select({ token: authTokens, ...userCoreColumns })
		.from(authTokens)
		.innerJoin(users, eq(authTokens.user_id, users.id))
		.where(
			and(
				eq(authTokens.id, token),
				eq(authTokens.type, type),
				gt(authTokens.expires_at, new Date())
			)
		)
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	const { token: authTokenRow, ...userRow } = row;
	// Delete the token so it can only be used once
	await db.delete(authTokens).where(eq(authTokens.id, authTokenRow.id));
	return withDefaultPreferences(userRow);
}

export async function markEmailVerified(userId: string): Promise<void> {
	await db.update(users).set({ email_verified: true, updated_at: new Date() }).where(eq(users.id, userId));
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
	const rows = await db
		.select(userCoreColumns)
		.from(googleAccounts)
		.innerJoin(users, eq(googleAccounts.user_id, users.id))
		.where(eq(googleAccounts.google_id, googleId))
		.limit(1);
	const row = rows[0];
	return row ? withDefaultPreferences(row) : null;
}

export async function getGoogleAccountForUser(
	userId: string
): Promise<{ google_id: string; email: string } | null> {
	const rows = await db
		.select({ google_id: googleAccounts.google_id, email: googleAccounts.email })
		.from(googleAccounts)
		.where(eq(googleAccounts.user_id, userId))
		.limit(1);
	return rows[0] ?? null;
}

/** Create a new user from a Google profile and link the Google account. */
export async function createUserFromGoogle(
	googleId: string,
	email: string,
	nickname: string
): Promise<User> {
	// Random unguessable password — Google-only users can set one via the reset flow
	const password_hash = await hashPassword(randomBytes(32).toString('hex'));
	const [row] = await db
		.insert(users)
		.values({ email: email.toLowerCase().trim(), password_hash, nickname, email_verified: true })
		.returning(userCoreColumns);
	const user = withDefaultPreferences(row);
	await db.insert(googleAccounts).values({ google_id: googleId, user_id: user.id, email });
	return user;
}

/** Link an existing user to a Google account. */
export async function linkGoogleAccount(
	userId: string,
	googleId: string,
	email: string
): Promise<void> {
	await db
		.insert(googleAccounts)
		.values({ google_id: googleId, user_id: userId, email })
		.onConflictDoNothing();
}

/** Remove a Google account link from a user. */
export async function unlinkGoogleAccount(userId: string): Promise<void> {
	await db.delete(googleAccounts).where(eq(googleAccounts.user_id, userId));
}

export { SESSION_COOKIE };
