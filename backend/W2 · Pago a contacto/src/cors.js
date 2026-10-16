export const DEFAULT_PAYMENT_CORS_ORIGINS = Object.freeze([
  "http://127.0.0.1:4200",
]);

const ALLOWED_METHODS = new Set(["GET", "POST"]);
const ALLOWED_HEADERS = new Set(["content-type", "idempotency-key"]);

export function parsePaymentCorsOrigins(value) {
  const origins = String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("PAYMENT_CORS_ORIGINS debe incluir al menos un origen explícito.");
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

function isFrontendRoute(method, path) {
  if (method === "GET") {
    return (
      path === "/health" ||
      /^\/wallets\/[^/]+$/u.test(path) ||
      path === "/payments" ||
      /^\/payments\/[^/]+$/u.test(path) ||
      /^\/payments\/[^/]+\/receipt$/u.test(path)
    );
  }

  if (method === "POST") {
    return path === "/payments" || /^\/payments\/[^/]+\/resolve$/u.test(path);
  }

  return false;
}

function sendCorsError(res, code, message) {
  return res.status(403).json({ error: { code, message } });
}

export function createPaymentCorsMiddleware(allowedOrigins) {
  const allowlist = new Set(allowedOrigins);

  return (req, res, next) => {
    const origin = req.get("Origin");
    if (!origin) return next();

    res.vary("Origin");
    if (!allowlist.has(origin)) {
      return sendCorsError(res, "CORS_ORIGIN_NOT_ALLOWED", "Origen no permitido.");
    }

    if (req.method !== "OPTIONS" && !isFrontendRoute(req.method, req.path)) {
      return sendCorsError(res, "CORS_ROUTE_NOT_ALLOWED", "Ruta no habilitada para acceso cross-origin.");
    }

    res.setHeader("Access-Control-Allow-Origin", origin);

    if (req.method !== "OPTIONS") return next();

    const requestedMethod = req.get("Access-Control-Request-Method");
    const requestedHeaders = (req.get("Access-Control-Request-Headers") ?? "")
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);

    if (
      !ALLOWED_METHODS.has(requestedMethod) ||
      !isFrontendRoute(requestedMethod, req.path) ||
      requestedHeaders.some((header) => !ALLOWED_HEADERS.has(header))
    ) {
      return sendCorsError(res, "CORS_PREFLIGHT_NOT_ALLOWED", "Preflight no permitido.");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
    res.setHeader("Access-Control-Max-Age", "600");
    return res.sendStatus(204);
  };
}