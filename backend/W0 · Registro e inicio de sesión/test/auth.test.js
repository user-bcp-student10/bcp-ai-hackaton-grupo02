import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AuthService, ACCESS_TOKEN_TTL_SECONDS } from "../src/auth-service.js";
import { AuthStore } from "../src/auth-store.js";
import { createApp } from "../src/app.js";

const sourceUsersFile = fileURLToPath(
  new URL("../../../db/users.json", import.meta.url),
);
const recordsKey = JSON.parse(readFileSync(sourceUsersFile, "utf8")).success
  ? "success"
  : "fixtures";
const validSignup = {
  documentType: "TEST",
  document: `TEST-${randomUUID()}`,
  password: "secret-not-to-disclose",
  email: `user-${randomUUID()}@example.test`,
};
const validLogin = {
  documentType: "TEST",
  document: validSignup.document,
  password: validSignup.password,
};

function createHarness({
  maxPayloadBytes = 4096,
  rateLimitMax = 100,
  rateLimitWindowMs = 60_000,
  authServiceOverride,
} = {}) {
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "w0-auth-test-"));
  const usersFilePath = path.join(temporaryDirectory, "users.json");
  copyFileSync(sourceUsersFile, usersFilePath);
  const store = new AuthStore({ usersFilePath });
  const authService =
    authServiceOverride ?? new AuthService({ store });
  const app = createApp({
    authService,
    maxPayloadBytes,
    rateLimitMax,
    rateLimitWindowMs,
  });
  const server = createServer(app);

  return {
    store,
    server,
    usersFilePath,
    cleanup() {
      store.close();
      rmSync(temporaryDirectory, { recursive: true, force: true });
    },
  };
}

async function startHarness(options) {
  const harness = createHarness(options);
  await new Promise((resolve) => harness.server.listen(0, "127.0.0.1", resolve));
  const address = harness.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    store: harness.store,
    server: harness.server,
    usersFilePath: harness.usersFilePath,
    async request(path, body) {
      return fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async close() {
      await new Promise((resolve, reject) => {
        harness.server.close((error) => (error ? reject(error) : resolve()));
      });
      harness.cleanup();
    },
  };
}

describe("W0 signup y login", () => {
  let server;
  let baseUrl;
  let harness;
  before(async () => {
    harness = createHarness();
    server = harness.server;
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    harness.cleanup();
  });

  it("registra sin crear wallet ni iniciar sesión y no almacena la contraseña", async () => {
    const response = await fetch(`${baseUrl}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validSignup),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(body).sort(), ["account_id", "status"]);
    assert.match(body.account_id, /^account-/u);
    assert.equal(body.status, "REGISTERED");
    assert.equal(JSON.stringify(body).includes(validSignup.password), false);

    const account = harness.store.findAccountByDocument(
      validSignup.documentType,
      validSignup.document,
    );
    assert.ok(account);
    assert.notEqual(account.passwordHash, validSignup.password);
    assert.notEqual(account.passwordSalt, validSignup.password);
    assert.equal(
      harness.store.database
        .prepare("SELECT count(*) AS count FROM access_tokens")
        .get().count,
      0,
    );

    const usersDocument = JSON.parse(readFileSync(harness.usersFilePath, "utf8"));
    const registeredUser = usersDocument[recordsKey].find(
      (user) => user.document === validSignup.document,
    );
    assert.equal(registeredUser.account_id, body.account_id);
    assert.equal(registeredUser.password, undefined);
    assert.equal(typeof registeredUser.passwordHash, "string");
    assert.equal(typeof registeredUser.passwordSalt, "string");
  });

  it("valida tipos, campos requeridos, documento TEST y correo", async (t) => {
    const invalidSignups = [
      { ...validSignup, documentType: "NATIONAL_ID" },
      { ...validSignup, document: "001" },
      { ...validSignup, documentType: "DNI", document: "1234567" },
      { ...validSignup, documentType: "CE", document: "12345678" },
      { ...validSignup, documentType: "DNI", document: "123456789" },
      { ...validSignup, email: "not-an-email" },
      { ...validSignup, email: "local..part@example.test" },
      { ...validSignup, password: 5 },
      { ...validSignup, email: null },
      { documentType: "TEST" },
      null,
    ];
    const invalidLogins = [
      { ...validLogin, documentType: "NATIONAL_ID" },
      { ...validLogin, document: "001" },
      { ...validLogin, documentType: "DNI", document: "1234567" },
      { ...validLogin, documentType: "CE", document: "12345678" },
      { ...validLogin, documentType: "CE", document: "1234567890" },
      { ...validLogin, documentType: "DNI", document: "123456789" },
      { ...validLogin, password: 5 },
      { documentType: "TEST" },
      null,
    ];

    for (const [index, payload] of invalidSignups.entries()) {
      await t.test(`signup inválido ${index + 1}`, async () => {
        const response = await fetch(`${baseUrl}/auth/signup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.error.code, "VALIDATION_ERROR");
        assert.equal(JSON.stringify(body).includes(validSignup.password), false);
      });
    }

    for (const [index, payload] of invalidLogins.entries()) {
      await t.test(`login inválido ${index + 1}`, async () => {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        assert.equal(response.status, 400);
        assert.equal(body.error.code, "VALIDATION_ERROR");
        assert.equal(JSON.stringify(body).includes(validLogin.password), false);
      });
    }
  });

  it("rechaza duplicidad de documento o correo con el mismo código", async () => {
    for (const duplicate of [
      { ...validSignup, email: "other@example.test" },
      {
        ...validSignup,
        document: `TEST-${randomUUID()}`,
        email: validSignup.email.toUpperCase(),
      },
    ]) {
      const response = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(duplicate),
      });
      const body = await response.json();
      assert.equal(response.status, 409);
      assert.equal(body.error.code, "ACCOUNT_ALREADY_EXISTS");
      assert.equal(JSON.stringify(body).includes(duplicate.password), false);
    }
  });

  it("resuelve altas concurrentes con la unicidad persistente", async () => {
    const suffix = randomUUID();
    const payload = {
      ...validSignup,
      document: `TEST-RACE-${suffix}`,
      email: `race-${suffix}@example.test`,
    };
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        fetch(`${baseUrl}/auth/signup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ),
    );

    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [201, 409],
    );
  });

  it("registra documentos DNI y CE con hash y permite autenticarlos", async () => {
    for (const [documentType, document] of [
      ["DNI", "87654321"],
      ["CE", "987654321"],
    ]) {
      const payload = {
        ...validSignup,
        documentType,
        document,
        email: `${documentType.toLowerCase()}-${randomUUID()}@example.test`,
      };
      const signup = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const signupBody = await signup.json();

      assert.equal(signup.status, 201);
      assert.equal(signupBody.status, "REGISTERED");
      assert.equal(JSON.stringify(signupBody).includes(payload.password), false);

      const stored = JSON.parse(readFileSync(harness.usersFilePath, "utf8"))[
        recordsKey
      ].find((user) => user.documentType === documentType && user.document === document);
      assert.equal(stored.password, undefined);
      assert.equal(typeof stored.passwordSalt, "string");
      assert.equal(typeof stored.passwordHash, "string");

      const login = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType,
          document,
          password: payload.password,
        }),
      });
      const loginBody = await login.json();
      assert.equal(login.status, 200);
      assert.equal(loginBody.account_id, signupBody.account_id);
      assert.deepEqual(Object.keys(loginBody).sort(), [
        "access_token",
        "account_id",
        "expires_in",
        "token_type",
      ]);
      assert.equal(JSON.stringify(loginBody).includes(payload.password), false);
    }
  });

  it("autentica las credenciales DNI/CE heredadas sin alterar sus filas ni consultar W1", async () => {
    const initialUsers = JSON.parse(readFileSync(harness.usersFilePath, "utf8"));
    const originalRecords = structuredClone(initialUsers[recordsKey]);
    const initialRootKeys = Object.keys(initialUsers);
    const legacyUsers = originalRecords.filter(
      (user) =>
        (user.documentType === "DNI" || user.documentType === "CE") &&
        typeof user.password === "string",
    );

    for (const legacyUser of legacyUsers) {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: legacyUser.documentType,
          document: legacyUser.document,
          password: legacyUser.password,
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.account_id.startsWith("account-"), true);
      if (typeof legacyUser.account_id === "string") {
        assert.equal(body.account_id, legacyUser.account_id);
      }
      assert.deepEqual(Object.keys(body).sort(), [
        "access_token",
        "account_id",
        "expires_in",
        "token_type",
      ]);
      assert.equal(JSON.stringify(body).includes(legacyUser.password), false);

      const repeatedResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: legacyUser.documentType,
          document: legacyUser.document,
          password: legacyUser.password,
        }),
      });
      const repeatedBody = await repeatedResponse.json();
      assert.equal(repeatedResponse.status, 200);
      assert.equal(repeatedBody.account_id, body.account_id);

      const invalidResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: legacyUser.documentType,
          document: legacyUser.document,
          password: `${legacyUser.password}-incorrect`,
        }),
      });
      const invalidBody = await invalidResponse.json();
      assert.equal(invalidResponse.status, 401);
      assert.equal(invalidBody.error.code, "INVALID_CREDENTIALS");

      const missingResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: legacyUser.documentType,
          document: legacyUser.documentType === "DNI" ? "00000000" : "000000000",
          password: legacyUser.password,
        }),
      });
      const missingBody = await missingResponse.json();
      assert.equal(missingResponse.status, 401);
      assert.deepEqual(invalidBody, missingBody);

      for (const duplicate of [
        {
          ...validSignup,
          documentType: legacyUser.documentType,
          document: legacyUser.document,
          email: `duplicate-${randomUUID()}@example.test`,
        },
        {
          ...validSignup,
          documentType: legacyUser.documentType,
          document: legacyUser.documentType === "DNI" ? "11223344" : "112233445",
          email: legacyUser.email,
        },
      ]) {
        const duplicateResponse = await fetch(`${baseUrl}/auth/signup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(duplicate),
        });
        const duplicateBody = await duplicateResponse.json();
        assert.equal(duplicateResponse.status, 409);
        assert.equal(duplicateBody.error.code, "ACCOUNT_ALREADY_EXISTS");
        assert.equal(JSON.stringify(duplicateBody).includes(duplicate.password), false);
      }
    }

    const updatedUsers = JSON.parse(readFileSync(harness.usersFilePath, "utf8"));
    assert.deepEqual(updatedUsers[recordsKey], originalRecords);
    assert.deepEqual(Object.keys(updatedUsers), initialRootKeys);
  });

  it("devuelve el mismo error genérico para documento inexistente y password incorrecta", async () => {
    const wrongPassword = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validLogin, password: "wrong-password" }),
    });
    const missingDocument = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validLogin, document: "TEST-MISSING" }),
    });
    const wrongBody = await wrongPassword.json();
    const missingBody = await missingDocument.json();

    assert.equal(wrongPassword.status, 401);
    assert.equal(missingDocument.status, 401);
    assert.deepEqual(wrongBody, missingBody);
    assert.equal(wrongBody.error.code, "INVALID_CREDENTIALS");
    assert.equal(JSON.stringify(wrongBody).includes("wrong-password"), false);
    assert.equal(JSON.stringify(missingBody).includes(validLogin.password), false);
  });

  it("emite token bearer y account_id sin depender de una wallet W1", async () => {
    const harness = await startHarness();

    try {
      const signup = await harness.request("/auth/signup", validSignup);
      const signupBody = await signup.json();
      const response = await harness.request("/auth/login", validLogin);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(Object.keys(body).sort(), [
        "access_token",
        "account_id",
        "expires_in",
        "token_type",
      ]);
      assert.equal(body.account_id, signupBody.account_id);
      assert.equal(body.token_type, "Bearer");
      assert.equal(body.expires_in, ACCESS_TOKEN_TTL_SECONDS);
      assert.match(body.access_token, /^[A-Za-z0-9_-]{43}$/u);
      assert.equal(JSON.stringify(body).includes(validLogin.password), false);

      const tokenHash = createHash("sha256").update(body.access_token).digest("hex");
      assert.equal(
        harness.store.database
          .prepare("SELECT count(*) AS count FROM access_tokens WHERE token_hash = ?")
          .get(tokenHash).count,
        1,
      );
      assert.equal(
        harness.store.database
          .prepare("SELECT count(*) AS count FROM access_tokens WHERE token_hash = ?")
          .get(body.access_token).count,
        0,
      );
    } finally {
      await harness.close();
    }
  });

  it("devuelve 413 para cuerpos excesivos en signup y login", async () => {
    const oversizedHarness = await startHarness({ maxPayloadBytes: 128 });
    const oversizedBody = { ...validSignup, email: `${"a".repeat(200)}@example.test` };

    try {
      for (const [path, payload] of [
        ["/auth/signup", oversizedBody],
        ["/auth/login", { ...validLogin, password: "x".repeat(200) }],
      ]) {
        const response = await oversizedHarness.request(path, payload);
        const body = await response.json();
        assert.equal(response.status, 413);
        assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
        assert.equal(JSON.stringify(body).includes(payload.password), false);
      }
    } finally {
      await oversizedHarness.close();
    }
  });

  it("devuelve 429 al superar el límite configurado en signup y login", async () => {
    for (const path of ["/auth/signup", "/auth/login"]) {
      const limitedHarness = await startHarness({ rateLimitMax: 1 });
      try {
        const payload = path.endsWith("signup") ? validSignup : validLogin;
        assert.equal((await limitedHarness.request(path, payload)).status, path.endsWith("signup") ? 201 : 401);
        const limitedResponse = await limitedHarness.request(path, payload);
        const body = await limitedResponse.json();
        assert.equal(limitedResponse.status, 429);
        assert.equal(body.error.code, "RATE_LIMITED");
        assert.ok(Number(limitedResponse.headers.get("retry-after")) >= 1);
        assert.equal(JSON.stringify(body).includes(payload.password), false);
      } finally {
        await limitedHarness.close();
      }
    }
  });

  it("devuelve 503 en signup y login si el servicio de autenticación falla", async () => {
    const unavailableHarness = await startHarness({
      authServiceOverride: {
        async signup() {
          throw new Error("database unavailable");
        },
        async login() {
          throw new Error("database unavailable");
        },
      },
    });
    try {
      for (const [path, payload] of [
        ["/auth/signup", validSignup],
        ["/auth/login", validLogin],
      ]) {
        const response = await unavailableHarness.request(path, payload);
        const body = await response.json();
        assert.equal(response.status, 503);
        assert.equal(body.error.code, "AUTH_UNAVAILABLE");
        assert.equal(JSON.stringify(body).includes(payload.password), false);
      }
    } finally {
      await unavailableHarness.close();
    }
  });
});
