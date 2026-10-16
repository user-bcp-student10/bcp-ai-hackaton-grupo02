import express from "express";
import { authUnavailableError, validationError } from "./errors.js";
import { createRateLimiter } from "./rate-limiter.js";
import { validateLogin, validateSignup } from "./validation.js";

function sendError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 503;
  const code = typeof error?.code === "string" ? error.code : "AUTH_UNAVAILABLE";
  const message =
    typeof error?.message === "string"
      ? error.message
      : "El servicio de autenticación no está disponible.";

  return res.status(status).json({ error: { code, message } });
}

export function createApp({
  authService,
  maxPayloadBytes,
  rateLimitMax,
  rateLimitWindowMs,
  rateLimiterNow,
}) {
  const app = express();
  const parseJson = express.json({ limit: maxPayloadBytes, strict: true });
  const rateLimiterOptions = {
    maxRequests: rateLimitMax,
    windowMs: rateLimitWindowMs,
    now: rateLimiterNow,
  };

  app.disable("x-powered-by");
  app.post("/auth/signup", createRateLimiter(rateLimiterOptions), parseJson, async (req, res) => {
    const input = validateSignup(req.body);
    const result = await authService.signup(input);
    return res.status(201).json(result);
  });

  app.post("/auth/login", createRateLimiter(rateLimiterOptions), parseJson, async (req, res) => {
    const input = validateLogin(req.body);
    const result = await authService.login(input);
    return res.status(200).json(result);
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error?.type === "entity.too.large") {
      return res
        .status(413)
        .json({ error: { code: "PAYLOAD_TOO_LARGE", message: "El cuerpo excede el tamaño permitido." } });
    }

    if (error?.type === "entity.parse.failed") {
      return sendError(res, validationError());
    }

    if (!Number.isInteger(error?.status)) {
      process.stderr.write(`W0 request failed: ${error?.code ?? error?.name ?? "UNKNOWN"}\n`);
      return sendError(res, authUnavailableError());
    }

    return sendError(res, error);
  });

  return app;
}
