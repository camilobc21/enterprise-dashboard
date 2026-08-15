import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const ALGORITHM = "scrypt";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${ALGORITHM}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, encodedSalt, encodedKey] = storedHash.split("$");
  if (algorithm !== ALGORITHM || !encodedSalt || !encodedKey) {
    return false;
  }

  try {
    const salt = Buffer.from(encodedSalt, "base64");
    const expectedKey = Buffer.from(encodedKey, "base64");
    const actualKey = scryptSync(password, salt, expectedKey.length);
    return timingSafeEqual(expectedKey, actualKey);
  } catch {
    return false;
  }
}
