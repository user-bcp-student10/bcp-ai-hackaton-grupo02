import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { accountAlreadyExistsError } from "./errors.js";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getUserRecords(content) {
  if (Array.isArray(content.success)) {
    return content.success;
  }
  if (Array.isArray(content.fixtures)) {
    return content.fixtures;
  }
  throw new Error("El archivo de usuarios debe contener un arreglo de usuarios.");
}

function readUsersFile(filePath) {
  const content = JSON.parse(readFileSync(filePath, "utf8"));
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content) ||
    getUserRecords(content).some(
      (user) =>
        user === null ||
        typeof user !== "object" ||
        Array.isArray(user) ||
        typeof user.document !== "string" ||
        typeof user.documentType !== "string" ||
        typeof user.email !== "string",
    )
  ) {
    throw new Error("El archivo de usuarios debe contener usuarios válidos.");
  }
  return content;
}

export class AuthStore {
  constructor({ usersFilePath, tokenDatabasePath = ":memory:" }) {
    if (typeof usersFilePath !== "string" || usersFilePath.length === 0) {
      throw new Error("usersFilePath debe apuntar a db/users.json.");
    }

    this.usersFilePath = path.resolve(usersFilePath);
    this.database = new DatabaseSync(tokenDatabasePath);
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec("PRAGMA busy_timeout = 5000");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS access_tokens (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX IF NOT EXISTS access_tokens_expires_at
        ON access_tokens(expires_at);
    `);
    readUsersFile(this.usersFilePath);
  }

  createAccount({ documentType, document, email, passwordSalt, passwordHash }) {
    const users = readUsersFile(this.usersFilePath);
    const records = getUserRecords(users);
    const normalizedEmail = normalizeEmail(email);
    const duplicate = records.some(
      (user) =>
        user.document === document ||
        normalizeEmail(user.email) === normalizedEmail,
    );

    if (duplicate) {
      throw accountAlreadyExistsError();
    }

    const accountId = `account-${randomUUID()}`;
    const account = {
      account_id: accountId,
      documentType,
      documentDescription: "Documento ficticio de prueba",
      document,
      email: normalizedEmail,
      passwordSalt,
      passwordHash,
    };

    records.push(account);
    this.writeUsersFile(users);
    return { accountId };
  }

  writeUsersFile(users) {
    const directory = path.dirname(this.usersFilePath);
    const temporaryPath = path.join(
      directory,
      `.users-${randomUUID()}.tmp`,
    );
    let fileDescriptor;

    try {
      fileDescriptor = openSync(temporaryPath, "wx", 0o600);
      writeFileSync(
        fileDescriptor,
        `${JSON.stringify(users, null, 2)}\n`,
        "utf8",
      );
      closeSync(fileDescriptor);
      fileDescriptor = undefined;
      renameSync(temporaryPath, this.usersFilePath);
    } catch (error) {
      if (fileDescriptor !== undefined) {
        closeSync(fileDescriptor);
      }
      try {
        unlinkSync(temporaryPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          throw cleanupError;
        }
      }
      throw error;
    }
  }

  findAccountByDocument(documentType, document) {
    const users = readUsersFile(this.usersFilePath);
    const user = getUserRecords(users).find(
      (candidate) =>
        candidate.documentType === documentType &&
        candidate.document === document &&
        ((typeof candidate.account_id === "string" &&
          typeof candidate.passwordSalt === "string" &&
          typeof candidate.passwordHash === "string") ||
          ((candidate.documentType === "DNI" || candidate.documentType === "CE") &&
            typeof candidate.password === "string")),
    );

    if (!user) {
      return null;
    }

    return {
      accountId:
        user.account_id ??
        `account-${createHash("sha256")
          .update(`${user.documentType}\0${user.document}`)
          .digest("hex")}`,
      documentType: user.documentType,
      document: user.document,
      email: user.email,
      passwordSalt: user.passwordSalt,
      passwordHash: user.passwordHash,
      legacyPassword:
        user.passwordSalt === undefined &&
        user.passwordHash === undefined &&
        (user.documentType === "DNI" || user.documentType === "CE")
          ? user.password
          : undefined,
    };
  }

  saveAccessToken({ tokenHash, accountId, expiresAt }) {
    this.database
      .prepare(`
        INSERT INTO access_tokens (token_hash, account_id, expires_at)
        VALUES (?, ?, ?)
      `)
      .run(tokenHash, accountId, expiresAt);
  }

  removeExpiredTokens(now) {
    this.database.prepare("DELETE FROM access_tokens WHERE expires_at <= ?").run(now);
  }

  close() {
    this.database.close();
  }
}
