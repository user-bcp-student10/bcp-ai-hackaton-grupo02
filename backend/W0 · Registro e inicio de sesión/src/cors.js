export const DEFAULT_CORS_ORIGINS = Object.freeze([
  "http://127.0.0.1:4200",
]);

export function parseCorsOrigins(value) {
  const origins = String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("AUTH_CORS_ORIGINS debe incluir al menos un origen explícito.");
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Origen CORS inválido: ${origin}`);
    }

    if (
      origin === "*" ||
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error(`Origen CORS inválido: ${origin}`);
    }
  }

  return [...new Set(origins)];
}

function corsError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

export function createCorsMiddleware(allowedOrigins) {
  const allowlist = new Set(allowedOrigins);
  const authPaths = new Set(["/auth/signup", "/auth/login"]);

  return (req, res, next) => {
    const origin = req.get("Origin");
    if (!origin) return next();

    res.vary("Origin");
    if (!allowlist.has(origin)) {
      return corsError(res, 403, "CORS_ORIGIN_NOT_ALLOWED", "Origen no permitido.");
    }

    res.setHeader("Access-Control-Allow-Origin", origin);

    if (req.method !== "OPTIONS") return next();

    const requestedMethod = req.get("Access-Control-Request-Method");
    const requestedHeaders = (req.get("Access-Control-Request-Headers") ?? "")
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);

    if (
      !authPaths.has(req.path) ||
      requestedMethod !== "POST" ||
      requestedHeaders.some((header) => header !== "content-type")
    ) {
      return corsError(res, 403, "CORS_PREFLIGHT_NOT_ALLOWED", "Preflight no permitido.");
    }

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  };
}