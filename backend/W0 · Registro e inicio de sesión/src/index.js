import path from "node:path";
import { mkdir } from "node:fs/promises";
import { AuthService } from "./auth-service.js";
import { AuthStore } from "./auth-store.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

await mkdir(path.dirname(config.usersFilePath), { recursive: true });
if (config.tokenDatabasePath !== ":memory:") {
  await mkdir(path.dirname(config.tokenDatabasePath), { recursive: true });
}

const store = new AuthStore({
  usersFilePath: config.usersFilePath,
  tokenDatabasePath: config.tokenDatabasePath,
});
const authService = new AuthService({ store });
const app = createApp({
  authService,
  maxPayloadBytes: config.maxPayloadBytes,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowMs: config.rateLimitWindowMs,
});

const server = app.listen(config.port, () => {
  process.stdout.write(`W0 listening on port ${config.port}\n`);
});

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
