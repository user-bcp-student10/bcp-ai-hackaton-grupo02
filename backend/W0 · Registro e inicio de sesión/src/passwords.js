import { promisify } from "node:util";
import {
  createHash,
  randomBytes,
  timingSafeEqual,
  scrypt as scryptCallback,
} from "node:crypto";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_SALT = Buffer.alloc(16, 0x57);
const DUMMY_HASH = Buffer.alloc(KEY_LENGTH, 0);

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return {
    passwordSalt: salt.toString("hex"),
    passwordHash: hash.toString("hex"),
  };
}

export async function verifyPassword(password, passwordSalt, passwordHash) {
  const salt = passwordSalt ? Buffer.from(passwordSalt, "hex") : DUMMY_SALT;
  const expectedHash = passwordHash ? Buffer.from(passwordHash, "hex") : DUMMY_HASH;
  const actualHash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return (
    expectedHash.length === actualHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
}

export async function verifyAccountPassword(password, account) {
  if (typeof account?.passwordSalt === "string" && typeof account.passwordHash === "string") {
    return verifyPassword(password, account.passwordSalt, account.passwordHash);
  }

  if (typeof account?.legacyPassword === "string") {
    await scrypt(password, DUMMY_SALT, KEY_LENGTH, SCRYPT_OPTIONS);
    const actualHash = createHash("sha256").update(password).digest();
    const expectedHash = createHash("sha256")
      .update(account.legacyPassword)
      .digest();
    return timingSafeEqual(actualHash, expectedHash);
  }

  return verifyPassword(password, undefined, undefined);
}
