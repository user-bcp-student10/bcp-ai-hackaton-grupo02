import express from "express";
import {
  apiError,
  invalidRequestError,
  notFoundError,
} from "./errors.js";

const RECIPIENTS = new Set(["contact-demo", "merchant-demo"]);
const MAX_PAYMENT_AMOUNT_CENTS = 200_000;
const SCENARIOS = new Set([
  "APPROVED",
  "REJECTED",
  "PENDING",
  "DELAYED_APPROVAL",
  "TIMEOUT_AFTER_PROCESSING",
  "PROVIDER_ERROR",
]);

function validatePaymentInput(body, idempotencyKey) {
  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length === 0 ||
    idempotencyKey.length > 200
  ) {
    throw invalidRequestError();
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw invalidRequestError();
  }

  const input = {
    walletId: body.walletId,
    recipient: body.recipient,
    amountCents: body.amountCents,
    currency: body.currency ?? "PEN",
    scenario: body.scenario ?? "APPROVED",
    qrId: body.qrId,
  };
  if (
    typeof input.walletId !== "string" ||
    input.walletId.length === 0 ||
    !RECIPIENTS.has(input.recipient) ||
    !Number.isInteger(input.amountCents) ||
    input.amountCents < 1 ||
    input.amountCents > 100_000_000 ||
    input.currency !== "PEN" ||
    !SCENARIOS.has(input.scenario) ||
    (input.qrId !== undefined &&
      (typeof input.qrId !== "string" || input.qrId.length === 0))
  ) {
    throw invalidRequestError();
  }
  if (input.amountCents > MAX_PAYMENT_AMOUNT_CENTS) {
    throw apiError(
      400,
      "PAYMENT_LIMIT_EXCEEDED",
      "El importe supera el límite máximo de PEN 2,000.00.",
    );
  }
  return input;
}

function sendError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const code =
    typeof error?.code === "string" ? error.code : "INTERNAL_ERROR";
  const message =
    status < 500 && typeof error?.message === "string"
      ? error.message
      : status === 500
        ? "El servicio de pagos no está disponible."
        : error.message;
  if (status === 500) {
    process.stderr.write(
      `W2 request failed: ${error?.code ?? error?.name ?? "UNKNOWN"}\n`,
    );
  }
  return res.status(status).json({ error: { code, message } });
}

export function createApp({ paymentStore, maxPayloadBytes = 16_384 }) {
  const app = express();
  const parseJson = express.json({ limit: maxPayloadBytes, strict: true });

  app.disable("x-powered-by");
  app.get("/health", (req, res) =>
    res.status(200).json({ status: "ok", service: "w2-payment-service" }),
  );

  app.get("/wallets/:id", (req, res) => {
    const wallet = paymentStore.getWallet(req.params.id);
    if (!wallet) {
      throw notFoundError("La wallet");
    }
    return res.status(200).json(wallet);
  });

  app.post("/payments", parseJson, (req, res) => {
    const idempotencyKey = req.get("Idempotency-Key");
    const input = validatePaymentInput(req.body, idempotencyKey);
    const result = paymentStore.createPayment(input, idempotencyKey);

    if (result.duplicate) {
      return res.status(200).json(result.payment);
    }
    if (input.scenario === "TIMEOUT_AFTER_PROCESSING") {
      return res.status(504).json({
        error: {
          code: "PAYMENT_RESULT_UNCONFIRMED",
          message:
            "La solicitud expiró antes de recibir confirmación; consulta el pago antes de volver a intentarlo.",
        },
        paymentId: result.payment.id,
      });
    }
    return res.status(202).json(result.payment);
  });

  app.get("/payments", (req, res) => {
    const walletId = req.query.walletId ?? "wallet-demo";
    if (typeof walletId !== "string") {
      throw invalidRequestError();
    }
    return res.status(200).json(paymentStore.listPayments(walletId));
  });

  app.get("/payments/:id/receipt", (req, res) =>
    res.status(200).json(paymentStore.getReceipt(req.params.id)),
  );

  app.get("/payments/:id", (req, res) => {
    const payment = paymentStore.getPayment(req.params.id);
    if (!payment) {
      throw notFoundError("El pago");
    }
    return res.status(200).json(payment);
  });

  app.get("/provider/payments/:id", (req, res) => {
    const payment = paymentStore.getProviderPayment(req.params.id);
    if (!payment) {
      throw notFoundError("El pago del proveedor");
    }
    return res.status(200).json(payment);
  });

  app.post("/payments/:id/resolve", (req, res) => {
    const result = paymentStore.resolvePayment(req.params.id);
    if (!result) {
      throw notFoundError("El pago");
    }
    if (result.escalated) {
      return res.status(result.status).json({
        ...result.payment,
        escalated: true,
      });
    }
    return res.status(result.status).json(result.payment);
  });

  app.post("/control/provider/:id/complete", parseJson, (req, res) => {
    const status = req.body?.status;
    if (status !== "SUCCEEDED" && status !== "REJECTED") {
      throw invalidRequestError();
    }
    const result = paymentStore.completeProvider(req.params.id, status);
    if (!result) {
      throw notFoundError("El pago del proveedor");
    }
    return res.status(200).json({
      payment: result.payment,
      duplicate: result.duplicate,
    });
  });

  app.get("/control/events", (req, res) =>
    res.status(200).json(paymentStore.listEvents()),
  );

  app.post("/control/events/:id/deliver", (req, res) => {
    const result = paymentStore.deliverEvent(req.params.id);
    if (!result) {
      throw notFoundError("El evento");
    }
    return res.status(200).json(result);
  });

  app.post("/callbacks/payments", parseJson, (req, res) => {
    if (
      req.body === null ||
      typeof req.body !== "object" ||
      typeof req.body.eventId !== "string" ||
      req.body.eventId.length === 0
    ) {
      throw invalidRequestError();
    }
    const result = paymentStore.deliverEvent(req.body.eventId);
    if (!result) {
      throw notFoundError("El evento");
    }
    return res.status(200).json(result);
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error?.type === "entity.too.large") {
      return res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "El cuerpo excede el tamaño permitido.",
        },
      });
    }
    if (error?.type === "entity.parse.failed") {
      return sendError(res, invalidRequestError());
    }
    return sendError(res, error);
  });

  return app;
}
