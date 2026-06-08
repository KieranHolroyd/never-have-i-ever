import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import {
	hashPassword as betterAuthHash,
	verifyPassword as betterAuthVerify,
} from 'better-auth/crypto';

const scryptAsync = promisify(scrypt);

/** Legacy scrypt format: `hexHash.hexSalt` */
async function verifyLegacyPassword(password: string, hash: string): Promise<boolean> {
	const [hashedPwd, salt] = hash.split('.');
	if (!hashedPwd || !salt) return false;
	const buf = (await scryptAsync(password, salt, 64)) as Buffer;
	const storedBuf = Buffer.from(hashedPwd, 'hex');
	if (buf.length !== storedBuf.length) return false;
	return timingSafeEqual(buf, storedBuf);
}

export async function hashPassword(password: string): Promise<string> {
	return betterAuthHash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	if (await betterAuthVerify({ hash, password })) return true;
	return verifyLegacyPassword(password, hash);
}

export function randomPassword(): string {
	return randomBytes(32).toString('hex');
}
