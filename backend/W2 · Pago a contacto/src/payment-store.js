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
import { fileURLToPath } from "node:url";
import {
  apiError,
  conflictError,
  notFoundError,
} from "./errors.js";

const PAYMENT_FIELDS = [
  "id",
  "wallet_id",
  "recipient",
  "amount",
  "status",
  "scenario",
  "idem",
  "fingerprint",
];

const defaultHistoryPath = fileURLToPath(
  new URL("../../../db/payment-history-by-wallet-id.json", import.meta.url),
);
const defaultWalletsPath = fileURLToPath(
  new URL("../../../db/wallet-balances.json", import.meta.url),
);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function publicPayment(payment) {
  return Object.fromEntries(
    PAYMENT_FIELDS.map((field) => [field, payment[field]]),
  );
}

function stableFingerprint(input) {
  const serialized = JSON.stringify({
    walletId: input.walletId,
    recipient: input.recipient,
    amountCents: input.amountCents,
    currency: input.currency,
    scenario: input.scenario,
    qrId: input.qrId ?? null,
  });
  return `fp-${createHash("sha256").update(serialized).digest("hex")}`;
}

function matchesExistingPayment(payment, input, fingerprint) {
  if (payment.fingerprint === fingerprint) {
    return true;
  }
  if (/^fp-[\da-f]{64}$/u.test(payment.fingerprint)) {
    return false;
  }
  return (
    input.currency === "PEN" &&
    input.qrId === undefined &&
    payment.wallet_id === input.walletId &&
    payment.recipient === input.recipient &&
    payment.amount === input.amountCents &&
    payment.scenario === input.scenario
  );
}

function providerStatusFor(scenario) {
  if (
    scenario === "APPROVED" ||
    scenario === "TIMEOUT_AFTER_PROCESSING"
  ) {
    return "SUCCEEDED";
  }
  if (scenario === "REJECTED") {
    return "REJECTED";
  }
  return "PENDING";
}

function writeJsonAtomically(filePath, data) {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.payment-history-${randomUUID()}.tmp`,
  );
  let descriptor;

  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, filePath);
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
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

export class PaymentStore {
  constructor({ historyPath = defaultHistoryPath, walletsPath = defaultWalletsPath }) {
    this.historyPath = path.resolve(historyPath);
    this.walletsPath = path.resolve(walletsPath);
    this.history = readJson(this.historyPath);
    this.walletFixture = readJson(this.walletsPath);
    this.events = new Map();
    this.providerStatuses = new Map();

    if (!Array.isArray(this.history?.success?.return)) {
      throw new Error("El historial W2 debe contener success.return como arreglo.");
    }
    if (
      this.walletFixture?.success?.return === null ||
      typeof this.walletFixture?.success?.return !== "object" ||
      Array.isArray(this.walletFixture.success.return)
    ) {
      throw new Error("La configuración de wallet W2 no contiene una wallet válida.");
    }

    for (const payment of this.history.success.return) {
      this.providerStatuses.set(
        payment.id,
        payment.status === "PENDING"
          ? providerStatusFor(payment.scenario)
          : payment.status,
      );
      if (
        payment.status === "PENDING" &&
        ["APPROVED", "REJECTED", "TIMEOUT_AFTER_PROCESSING"].includes(
          payment.scenario,
        )
      ) {
        this.enqueueEvent(payment, providerStatusFor(payment.scenario));
      }
    }
  }

  createPayment(input, idempotencyKey) {
    const fingerprint = stableFingerprint(input);
    const existing = this.history.success.return.find(
      (payment) =>
        payment.wallet_id === input.walletId &&
        payment.idem === idempotencyKey,
    );

    if (existing) {
      if (!matchesExistingPayment(existing, input, fingerprint)) {
        throw conflictError(
          "IDEMPOTENCY_CONFLICT",
          "La clave de idempotencia ya fue utilizada con otro contenido.",
        );
      }
      return { payment: publicPayment(existing), duplicate: true };
    }

    const wallet = this.findWallet(input.walletId);
    if (!wallet) {
      throw notFoundError("La wallet");
    }
    if (wallet.status !== "ACTIVE") {
      throw conflictError(
        "WALLET_NOT_ACTIVE",
        "La wallet no está activa para realizar pagos.",
      );
    }
    if (input.qrId) {
      throw notFoundError("El QR");
    }
    if (this.getWallet(input.walletId).available < input.amountCents) {
      throw conflictError(
        "INSUFFICIENT_FUNDS",
        "El saldo disponible es insuficiente para realizar el pago.",
      );
    }
    if (input.scenario === "PROVIDER_ERROR") {
      throw apiError(
        503,
        "PROVIDER_UNAVAILABLE",
        "El proveedor de pagos no está disponible.",
      );
    }

    const payment = {
      id: `payment-${randomUUID()}`,
      wallet_id: input.walletId,
      recipient: input.recipient,
      amount: input.amountCents,
      status: "PENDING",
      scenario: input.scenario,
      idem: idempotencyKey,
      fingerprint,
    };
    const nextHistory = {
      ...this.history,
      success: {
        ...this.history.success,
        return: [...this.history.success.return, payment],
      },
    };
    writeJsonAtomically(this.historyPath, nextHistory);
    this.history = nextHistory;

    const providerStatus = providerStatusFor(payment.scenario);
    this.providerStatuses.set(payment.id, providerStatus);
    if (
      ["APPROVED", "REJECTED", "TIMEOUT_AFTER_PROCESSING"].includes(
        payment.scenario,
      )
    ) {
      this.enqueueEvent(payment, providerStatus);
    }

    return {
      payment: publicPayment(payment),
      duplicate: false,
    };
  }

  getWallet(walletId) {
    const wallet = this.findWallet(walletId);
    if (!wallet) {
      return null;
    }

    const payments = this.history.success.return.filter(
      (payment) => payment.wallet_id === walletId,
    );
    const debited = payments
      .filter((payment) => payment.status === "SUCCEEDED")
      .reduce((total, payment) => total + payment.amount, 0);
    const reserved = payments
      .filter((payment) => payment.status === "PENDING")
      .reduce((total, payment) => total + payment.amount, 0);
    const balance = Math.max(0, wallet.balance - debited);

    return {
      id: wallet.id,
      status: wallet.status,
      balance,
      reserved,
      available: Math.max(0, balance - reserved),
      currency: wallet.currency,
    };
  }

  listPayments(walletId = "wallet-demo") {
    return this.history.success.return
      .filter((payment) => payment.wallet_id === walletId)
      .map(publicPayment);
  }

  getPayment(paymentId) {
    const payment = this.findPayment(paymentId);
    return payment ? publicPayment(payment) : null;
  }

  getReceipt(paymentId) {
    const payment = this.findPayment(paymentId);
    if (!payment) {
      throw notFoundError("El pago");
    }
    if (payment.status !== "SUCCEEDED" && payment.status !== "REVERSED") {
      throw conflictError(
        "RECEIPT_NOT_READY",
        "El comprobante estará disponible cuando el pago se complete.",
      );
    }
    return {
      receiptId: `receipt-${payment.id}`,
      paymentId: payment.id,
      amountCents: payment.amount,
      currency: "PEN",
      recipient: payment.recipient,
      status: payment.status,
    };
  }

  getProviderPayment(paymentId) {
    const payment = this.findPayment(paymentId);
    if (!payment) {
      return null;
    }
    return {
      id: payment.id,
      amount: payment.amount,
      status:
        this.providerStatuses.get(payment.id) ??
        providerStatusFor(payment.scenario),
    };
  }

  resolvePayment(paymentId) {
    const payment = this.findPayment(paymentId);
    if (!payment) {
      return null;
    }
    if (payment.status !== "PENDING") {
      return { status: 200, payment: publicPayment(payment) };
    }

    const providerStatus =
      this.providerStatuses.get(payment.id) ??
      providerStatusFor(payment.scenario);
    if (providerStatus === "PENDING") {
      return {
        status: 202,
        payment: publicPayment(payment),
        escalated: true,
      };
    }

    const updatedPayment = this.setPaymentStatus(payment, providerStatus);
    return { status: 200, payment: publicPayment(updatedPayment) };
  }

  completeProvider(paymentId, status) {
    const payment = this.findPayment(paymentId);
    if (!payment) {
      return null;
    }
    if (!["PENDING", "DELAYED_APPROVAL"].includes(payment.scenario)) {
      throw conflictError(
        "INVALID_STATE_TRANSITION",
        "El escenario del pago no permite completar manualmente al proveedor.",
      );
    }
    const currentProviderStatus =
      this.providerStatuses.get(payment.id) ?? "PENDING";
    if (currentProviderStatus !== "PENDING") {
      if (currentProviderStatus === status) {
        return { payment: publicPayment(payment), duplicate: true };
      }
      throw conflictError(
        "INVALID_STATE_TRANSITION",
        "El proveedor ya confirmó un resultado distinto para este pago.",
      );
    }
    this.providerStatuses.set(payment.id, status);
    this.enqueueEvent(payment, status);
    return { payment: publicPayment(payment), duplicate: false };
  }

  listEvents() {
    return [...this.events.values()].map((event) => ({
      id: event.id,
      payment_id: event.paymentId,
      status: event.status,
      deliveryCount: event.deliveryCount,
    }));
  }

  deliverEvent(eventId) {
    const event = this.events.get(eventId);
    if (!event) {
      return null;
    }
    const payment = this.findPayment(event.paymentId);
    if (!payment) {
      throw notFoundError("El pago del evento");
    }
    if (event.delivered) {
      event.deliveryCount += 1;
      return { duplicate: true, payment: publicPayment(payment) };
    }
    if (payment.status !== "PENDING") {
      if (payment.status === event.status) {
        event.delivered = true;
        event.deliveryCount += 1;
        return { duplicate: true, payment: publicPayment(payment) };
      }
      throw conflictError(
        "INVALID_STATE_TRANSITION",
        "El evento contradice el resultado ya confirmado del pago.",
      );
    }
    const updatedPayment = this.setPaymentStatus(payment, event.status);
    event.delivered = true;
    event.deliveryCount += 1;
    return { duplicate: false, payment: publicPayment(updatedPayment) };
  }

  findPayment(paymentId) {
    return this.history.success.return.find(
      (payment) => payment.id === paymentId,
    );
  }

  findWallet(walletId) {
    const wallet = this.walletFixture.success.return;
    return wallet.id === walletId ? wallet : null;
  }

  enqueueEvent(payment, status) {
    const existingEvent = [...this.events.values()].find(
      (event) => event.paymentId === payment.id && !event.delivered,
    );
    if (existingEvent) {
      return existingEvent;
    }
    const event = {
      id: `event-${randomUUID()}`,
      paymentId: payment.id,
      status,
      delivered: false,
      deliveryCount: 0,
    };
    this.events.set(event.id, event);
    return event;
  }

  setPaymentStatus(payment, status) {
    if (payment.status !== "PENDING") {
      if (payment.status === status) {
        return payment;
      }
      throw conflictError(
        "INVALID_STATE_TRANSITION",
        "El pago ya tiene un resultado terminal distinto.",
      );
    }
    if (status !== "SUCCEEDED" && status !== "REJECTED") {
      throw conflictError(
        "INVALID_STATE_TRANSITION",
        "El evento no contiene un resultado terminal válido.",
      );
    }

    const updatedPayment = { ...payment, status };
    const nextHistory = {
      ...this.history,
      success: {
        ...this.history.success,
        return: this.history.success.return.map((current) =>
          current.id === payment.id ? updatedPayment : current,
        ),
      },
    };
    writeJsonAtomically(this.historyPath, nextHistory);
    this.history = nextHistory;
    return updatedPayment;
  }
}
