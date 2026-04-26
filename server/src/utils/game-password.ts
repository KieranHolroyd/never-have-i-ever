import { ValidationError } from "../errors";

const MIN_ROOM_PASSWORD_LENGTH = 4;
const MAX_ROOM_PASSWORD_LENGTH = 64;

export function normalizeRoomPassword(password?: string | null): string | null {
  if (typeof password !== "string") {
    return null;
  }

  const normalized = password.trim();
  return normalized.length > 0 ? normalized : null;
}

export function validateRoomPassword(password: string): void {
  if (password.length < MIN_ROOM_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Room password must be at least ${MIN_ROOM_PASSWORD_LENGTH} characters long`
    );
  }

  if (password.length > MAX_ROOM_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Room password cannot exceed ${MAX_ROOM_PASSWORD_LENGTH} characters`
    );
  }
}

export async function hashRoomPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

export async function verifyRoomPassword(password: string, passwordHash: string): Promise<boolean> {
  return await Bun.password.verify(password, passwordHash);
}