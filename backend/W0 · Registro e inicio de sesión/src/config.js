import { fileURLToPath } from "node:url";
import path from "node:path";
import { DEFAULT_CORS_ORIGINS, parseCorsOrigins } from "./cors.js";

const defaultUsersFilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/users.json",
);

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} debe configurarse como un entero positivo.`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  return {
    port: positiveInteger(env.PORT ?? "3000", "PORT"),
    usersFilePath: path.resolve(
      env.AUTH_USERS_FILE ?? defaultUsersFilePath,
    ),
    tokenDatabasePath: env.AUTH_TOKEN_DATABASE_PATH
      ? path.resolve(env.AUTH_TOKEN_DATABASE_PATH)
      : path.resolve("data/auth-tokens.sqlite"),
    maxPayloadBytes: positiveInteger(
      env.AUTH_MAX_PAYLOAD_BYTES,
      "AUTH_MAX_PAYLOAD_BYTES",
    ),
    rateLimitMax: positiveInteger(env.AUTH_RATE_LIMIT_MAX, "AUTH_RATE_LIMIT_MAX"),
    rateLimitWindowMs: positiveInteger(
      env.AUTH_RATE_LIMIT_WINDOW_MS,
      "AUTH_RATE_LIMIT_WINDOW_MS",
    ),
    corsOrigins: parseCorsOrigins(
      env.AUTH_CORS_ORIGINS ?? DEFAULT_CORS_ORIGINS.join(","),
    ),
  };
}
