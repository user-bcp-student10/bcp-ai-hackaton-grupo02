import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createServer } from "node:http";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { PaymentStore } from "../src/payment-store.js";

const temporaryDirectories = new Set();
const walletFixture = {
  success: {
    status: "200",
    return: {
      id: "wallet-demo",
      status: "ACTIVE",
      balance: 100_000,
      reserved: 0,
      available: 100_000,
      currency: "PEN",
    },
  },
  error: { status: "500", message: "Internal Server Error" },
};

function createHarness(initialPayments = [], balance = 100_000, corsOrigins) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "w2-payment-test-"));
  temporaryDirectories.add(directory);
  const historyPath = path.join(directory, "payment-history.json");
  const walletsPath = path.join(directory, "wallet-balances.json");
  writeFileSync(
    historyPath,
    JSON.stringify({
      success: { status: "200", return: initialPayments },
      error: { status: "500", message: "Internal Server Error" },
    }),
  );
  writeFileSync(
    walletsPath,
    JSON.stringify({
      ...walletFixture,
      success: {
        ...walletFixture.success,
        return: { ...walletFixture.success.return, balance },
      },
    }),
  );

  const paymentStore = new PaymentStore({ historyPath, walletsPath });
  const server = createServer(
    createApp({ paymentStore, ...(corsOrigins ? { corsOrigins } : {}) }),
  );
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        historyPath,
        baseUrl: `http://127.0.0.1:${port}`,
        async request(url, { method = "GET", body, headers = {} } = {}) {
          return fetch(`${this.baseUrl}${url}`, {
            method,
            headers: {
              ...(body === undefined ? {} : { "content-type": "application/json" }),
              ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
          });
        },
        async close() {
          await new Promise((closeResolve, closeReject) =>
            server.close((error) =>
              error ? closeReject(error) : closeResolve(),
            ),
          );
        },
      });
    });
  });
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
});

const paymentBody = {
  walletId: "wallet-demo",
  recipient: "contact-demo",
  amountCents: 1500,
  currency: "PEN",
  scenario: "APPROVED",
};

describe("W2 payments API", () => {
  it("reserva saldo, confirma una sola vez y habilita historial y comprobante", async () => {
    const harness = await createHarness();
    try {
      const created = await harness.request("/payments", {
        method: "POST",
        body: paymentBody,
        headers: { "Idempotency-Key": "approved-001" },
      });
      const payment = await created.json();
      assert.equal(created.status, 202);
      assert.equal(payment.status, "PENDING");

      const walletResponse = await harness.request("/wallets/wallet-demo");
      assert.deepEqual(await walletResponse.json(), {
        id: "wallet-demo",
        status: "ACTIVE",
        balance: 100_000,
        reserved: 1500,
        available: 98_500,
        currency: "PEN",
      });

      const eventsResponse = await harness.request("/control/events");
      const [event] = await eventsResponse.json();
      const delivered = await harness.request(
        `/control/events/${event.id}/deliver`,
        { method: "POST" },
      );
      assert.equal(delivered.status, 200);
      assert.equal((await delivered.json()).payment.status, "SUCCEEDED");

      const repeated = await harness.request("/payments", {
        method: "POST",
        body: paymentBody,
        headers: { "Idempotency-Key": "approved-001" },
      });
      assert.equal(repeated.status, 200);
      assert.equal((await repeated.json()).id, payment.id);

      const history = await harness.request("/payments?walletId=wallet-demo");
      const payments = await history.json();
      assert.equal(payments.length, 1);
      assert.equal(payments[0].status, "SUCCEEDED");

      const receiptResponse = await harness.request(
        `/payments/${payment.id}/receipt`,
      );
      assert.equal(receiptResponse.status, 200);
      assert.equal((await receiptResponse.json()).paymentId, payment.id);

      const persisted = JSON.parse(readFileSync(harness.historyPath, "utf8"));
      assert.equal(persisted.success.return[0].id, payment.id);
      const finalWallet = await harness.request("/wallets/wallet-demo");
      assert.deepEqual(await finalWallet.json(), {
        id: "wallet-demo",
        status: "ACTIVE",
        balance: 98_500,
        reserved: 0,
        available: 98_500,
        currency: "PEN",
      });
    } finally {
      await harness.close();
    }
  });

  it("rechaza una clave reutilizada con contenido distinto", async () => {
    const harness = await createHarness();
    try {
      const create = () =>
        harness.request("/payments", {
          method: "POST",
          body: paymentBody,
          headers: { "Idempotency-Key": "conflict-001" },
        });
      const first = await create();
      const firstPayment = await first.json();
      const conflicting = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 2500 },
        headers: { "Idempotency-Key": "conflict-001" },
      });
      assert.equal(first.status, 202);
      assert.equal(conflicting.status, 409);
      assert.equal(
        (await conflicting.json()).error.code,
        "IDEMPOTENCY_CONFLICT",
      );
      const history = await harness.request("/payments");
      assert.deepEqual((await history.json()).map(({ id }) => id), [
        firstPayment.id,
      ]);
    } finally {
      await harness.close();
    }
  });

  it("reconoce el registro histórico de ejemplo al reintentar su misma operación", async () => {
    const historicalPayment = {
      id: "payment-001",
      wallet_id: "wallet-demo",
      recipient: "contact-demo",
      amount: 1500,
      status: "SUCCEEDED",
      scenario: "APPROVED",
      idem: "contact-payment-001",
      fingerprint: "fp-synthetic-001",
    };
    const harness = await createHarness([historicalPayment]);
    try {
      const repeated = await harness.request("/payments", {
        method: "POST",
        body: paymentBody,
        headers: { "Idempotency-Key": "contact-payment-001" },
      });
      assert.equal(repeated.status, 200);
      assert.equal((await repeated.json()).id, historicalPayment.id);

      const conflict = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 1600 },
        headers: { "Idempotency-Key": "contact-payment-001" },
      });
      assert.equal(conflict.status, 409);
      const history = await harness.request("/payments");
      assert.equal((await history.json()).length, 1);
    } finally {
      await harness.close();
    }
  });

  it("serializa solicitudes simultáneas con la misma clave", async () => {
    const harness = await createHarness();
    try {
      const request = () =>
        harness.request("/payments", {
          method: "POST",
          body: paymentBody,
          headers: { "Idempotency-Key": "concurrent-001" },
        });
      const responses = await Promise.all([request(), request()]);
      const bodies = await Promise.all(responses.map((response) => response.json()));
      assert.deepEqual(
        responses.map((response) => response.status).sort(),
        [200, 202],
      );
      assert.equal(new Set(bodies.map(({ id }) => id)).size, 1);
      const payments = await (await harness.request("/payments")).json();
      assert.equal(payments.length, 1);
      const wallet = await (await harness.request("/wallets/wallet-demo")).json();
      assert.equal(wallet.reserved, 1500);
    } finally {
      await harness.close();
    }
  });

  it("resuelve un timeout usando el mismo pago sin crear otro", async () => {
    const harness = await createHarness();
    try {
      const timedOut = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, scenario: "TIMEOUT_AFTER_PROCESSING" },
        headers: { "Idempotency-Key": "timeout-001" },
      });
      const timeoutBody = await timedOut.json();
      assert.equal(timedOut.status, 504);
      assert.equal(typeof timeoutBody.paymentId, "string");

      const pending = await harness.request(`/payments/${timeoutBody.paymentId}`);
      assert.equal((await pending.json()).status, "PENDING");
      const resolved = await harness.request(
        `/payments/${timeoutBody.paymentId}/resolve`,
        { method: "POST" },
      );
      assert.equal(resolved.status, 200);
      assert.equal((await resolved.json()).status, "SUCCEEDED");

      const retried = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, scenario: "TIMEOUT_AFTER_PROCESSING" },
        headers: { "Idempotency-Key": "timeout-001" },
      });
      assert.equal(retried.status, 200);
      assert.equal((await retried.json()).id, timeoutBody.paymentId);
      const history = await harness.request("/payments");
      const payments = await history.json();
      assert.equal(payments.length, 1);
      assert.equal(payments[0].status, "SUCCEEDED");
      const receipt = await harness.request(
        `/payments/${timeoutBody.paymentId}/receipt`,
      );
      assert.equal(receipt.status, 200);
      assert.equal((await receipt.json()).paymentId, timeoutBody.paymentId);
    } finally {
      await harness.close();
    }
  });

  it("mantiene pendiente el resultado incierto y libera saldo tras un rechazo", async () => {
    const harness = await createHarness();
    try {
      const created = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, scenario: "PENDING" },
        headers: { "Idempotency-Key": "pending-001" },
      });
      const payment = await created.json();
      const unresolved = await harness.request(
        `/payments/${payment.id}/resolve`,
        { method: "POST" },
      );
      assert.equal(unresolved.status, 202);
      assert.equal((await unresolved.json()).status, "PENDING");

      const completed = await harness.request(
        `/control/provider/${payment.id}/complete`,
        {
          method: "POST",
          body: { status: "REJECTED" },
        },
      );
      assert.equal(completed.status, 200);
      const [event] = await (await harness.request("/control/events")).json();
      await harness.request(`/control/events/${event.id}/deliver`, {
        method: "POST",
      });
      const result = await harness.request(`/payments/${payment.id}`);
      assert.equal((await result.json()).status, "REJECTED");
      const receipt = await harness.request(`/payments/${payment.id}/receipt`);
      assert.equal(receipt.status, 409);
      const wallet = await harness.request("/wallets/wallet-demo");
      assert.deepEqual(await wallet.json(), {
        id: "wallet-demo",
        status: "ACTIVE",
        balance: 100_000,
        reserved: 0,
        available: 100_000,
        currency: "PEN",
      });
    } finally {
      await harness.close();
    }
  });

  it("rechaza solicitudes inválidas y no persiste un error previo del proveedor", async () => {
    const harness = await createHarness();
    try {
      const invalid = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 0 },
        headers: { "Idempotency-Key": "invalid-001" },
      });
      assert.equal(invalid.status, 400);

      const providerError = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, scenario: "PROVIDER_ERROR" },
        headers: { "Idempotency-Key": "provider-error-001" },
      });
      assert.equal(providerError.status, 503);
      const history = await harness.request("/payments");
      assert.deepEqual(await history.json(), []);
    } finally {
      await harness.close();
    }
  });

  it("rechaza pagos por encima del saldo disponible sin reservar fondos", async () => {
    const existingPayment = {
      id: "payment-existing",
      wallet_id: "wallet-demo",
      recipient: "contact-demo",
      amount: 99_000,
      status: "SUCCEEDED",
      scenario: "APPROVED",
      idem: "existing-payment",
      fingerprint: "fp-existing",
    };
    const harness = await createHarness([existingPayment]);
    try {
      const response = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 2000 },
        headers: { "Idempotency-Key": "insufficient-001" },
      });
      assert.equal(response.status, 409);
      assert.equal((await response.json()).error.code, "INSUFFICIENT_FUNDS");
      const wallet = await harness.request("/wallets/wallet-demo");
      assert.deepEqual(await wallet.json(), {
        id: "wallet-demo",
        status: "ACTIVE",
        balance: 1000,
        reserved: 0,
        available: 1000,
        currency: "PEN",
      });
      const history = await harness.request("/payments");
      assert.equal((await history.json()).length, 1);
    } finally {
      await harness.close();
    }
  });

  it("aplica el máximo global aprobado de PEN 2,000.00 antes de crear pagos", async () => {
    const harness = await createHarness([], 250_000);
    try {
      const atLimit = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 200_000 },
        headers: { "Idempotency-Key": "limit-inclusive-001" },
      });
      assert.equal(atLimit.status, 202);

      const overLimit = await harness.request("/payments", {
        method: "POST",
        body: { ...paymentBody, amountCents: 200_001 },
        headers: { "Idempotency-Key": "limit-exceeded-001" },
      });
      assert.equal(overLimit.status, 400);
      assert.equal(
        (await overLimit.json()).error.code,
        "PAYMENT_LIMIT_EXCEEDED",
      );

      const history = await harness.request("/payments");
      assert.equal((await history.json()).length, 1);
      const wallet = await harness.request("/wallets/wallet-demo");
      assert.deepEqual(await wallet.json(), {
        id: "wallet-demo",
        status: "ACTIVE",
        balance: 250_000,
        reserved: 200_000,
        available: 50_000,
        currency: "PEN",
      });
    } finally {
      await harness.close();
    }
  });

  it("permite el origen del frontend y no habilita credenciales", async () => {
    const harness = await createHarness();
    try {
      const response = await harness.request("/health", {
        headers: { Origin: "http://127.0.0.1:4200" },
      });
      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get("access-control-allow-origin"),
        "http://127.0.0.1:4200",
      );
      assert.equal(response.headers.get("access-control-allow-credentials"), null);
      assert.match(response.headers.get("vary") ?? "", /Origin/u);
    } finally {
      await harness.close();
    }
  });

  it("responde el preflight de creación con los métodos y headers W2 permitidos", async () => {
    const harness = await createHarness();
    try {
      const response = await harness.request("/payments", {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:4200",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type, idempotency-key",
        },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4200");
      assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
      assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type, Idempotency-Key");
      assert.equal(response.headers.get("access-control-allow-credentials"), null);
    } finally {
      await harness.close();
    }
  });

  it("rechaza el preflight para controles internos y headers no autorizados", async () => {
    const harness = await createHarness();
    try {
      const controlRequest = await harness.request("/control/events", {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:4200",
          "Access-Control-Request-Method": "GET",
        },
      });
      assert.equal(controlRequest.status, 403);

      const authHeaderRequest = await harness.request("/payments", {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:4200",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type, authorization",
        },
      });
      assert.equal(authHeaderRequest.status, 403);

      const controlRead = await harness.request("/control/events", {
        headers: { Origin: "http://127.0.0.1:4200" },
      });
      assert.equal(controlRead.status, 403);
      assert.equal((await controlRead.json()).error.code, "CORS_ROUTE_NOT_ALLOWED");
    } finally {
      await harness.close();
    }
  });

  it("rechaza un origen externo antes de crear un pago", async () => {
    const harness = await createHarness();
    try {
      const response = await harness.request("/payments", {
        method: "POST",
        body: paymentBody,
        headers: {
          Origin: "https://untrusted.example",
          "Idempotency-Key": "cors-denied-001",
        },
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error.code, "CORS_ORIGIN_NOT_ALLOWED");
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      assert.deepEqual(await (await harness.request("/payments")).json(), []);
    } finally {
      await harness.close();
    }
  });
});
