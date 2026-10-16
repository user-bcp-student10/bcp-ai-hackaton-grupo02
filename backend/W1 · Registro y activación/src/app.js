import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const DEFAULT_FIXTURES_DIRECTORY = new URL('../../../db/', import.meta.url);
const BODY_LIMIT = 16 * 1024;
const SCENARIOS = new Set(['APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'UNAVAILABLE']);
const DECISIONS = new Set(['ACTIVE', 'REJECTED']);

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR');
  }
}

function requireObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR');
  }
  return value;
}

async function readFixture(directory, name) {
  const fixture = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
  if (
    !fixture?.success
    || !Number.isInteger(Number(fixture.success.status))
    || !Object.hasOwn(fixture.success, 'return')
  ) {
    throw new Error(`Invalid response fixture: ${name}`);
  }
  return fixture.success.return;
}

async function createStore(fixturesDirectory) {
  const [
    createVerification,
    getVerification,
    resolveVerification,
    walletFixture,
    supportCasesFixture,
  ] = await Promise.all([
    readFixture(fixturesDirectory, 'create-wallet-with-simulated-kyc.json'),
    readFixture(fixturesDirectory, 'get-kyc-verification.json'),
    readFixture(fixturesDirectory, 'resolve-human-review.json'),
    readFixture(fixturesDirectory, 'wallet-balances.json'),
    readFixture(fixturesDirectory, 'open-and-resolved-support-cases.json'),
  ]);

  const store = {
    verifications: new Map(),
    wallets: new Map([[walletFixture.id, structuredClone(walletFixture)]]),
    supportCases: new Map(supportCasesFixture.map((supportCase) => [
      supportCase.id,
      structuredClone(supportCase),
    ])),
  };

  for (const verification of [createVerification, getVerification, resolveVerification]) {
    store.verifications.set(verification.id, structuredClone(verification));
    if (!store.wallets.has(verification.wallet_id)) {
      store.wallets.set(verification.wallet_id, {
        id: verification.wallet_id,
        status: verification.status,
        balance: 0,
        reserved: 0,
        currency: 'PEN',
      });
    }
  }

  return store;
}

function decodeId(rawId) {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return null;
  }
}

function createVerification(body, store) {
  requireObject(body);

  if (
    body.documentType !== 'TEST'
    || typeof body.document !== 'string'
    || !/^TEST-[A-Za-z0-9-]{1,64}$/.test(body.document)
    || typeof body.password !== 'string'
    || body.password.length < 1
    || body.password.length > 128
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR');
  }

  const scenario = body.scenario ?? 'APPROVED';
  if (typeof scenario !== 'string' || !SCENARIOS.has(scenario)) {
    throw new ApiError(400, 'INVALID_SCENARIO');
  }
  if (scenario === 'UNAVAILABLE') throw new ApiError(503, 'KYC_UNAVAILABLE');

  const status = scenario === 'APPROVED'
    ? 'ACTIVE'
    : scenario === 'REJECTED'
      ? 'REJECTED'
      : 'PENDING';
  const verification = {
    id: `kyc-${randomUUID()}`,
    wallet_id: `wallet-${randomUUID()}`,
    scenario,
    status,
  };

  store.verifications.set(verification.id, verification);
  store.wallets.set(verification.wallet_id, {
    id: verification.wallet_id,
    status,
    balance: 0,
    reserved: 0,
    currency: 'PEN',
  });

  if (scenario === 'MANUAL_REVIEW') {
    const supportCase = {
      id: `case-${randomUUID()}`,
      resource: verification.id,
      reason: 'KYC_MANUAL_REVIEW',
      status: 'OPEN',
    };
    store.supportCases.set(supportCase.id, supportCase);
  }

  return verification;
}

function decideVerification(body, verificationId, store) {
  requireObject(body);
  if (typeof body.decision !== 'string' || !DECISIONS.has(body.decision)) {
    throw new ApiError(400, 'INVALID_DECISION');
  }

  const verification = store.verifications.get(verificationId);
  if (!verification) throw new ApiError(404, 'NOT_FOUND');
  if (verification.status !== 'PENDING' && verification.status !== body.decision) {
    throw new ApiError(409, 'DECISION_CONFLICT');
  }

  verification.status = body.decision;
  store.wallets.get(verification.wallet_id).status = body.decision;

  for (const supportCase of store.supportCases.values()) {
    if (supportCase.resource === verificationId) supportCase.status = 'RESOLVED';
  }

  return verification;
}

export function createApp({
  fixturesDirectory = DEFAULT_FIXTURES_DIRECTORY,
} = {}) {
  const storePromise = createStore(fixturesDirectory);

  return async function handleRequest(request, response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');

    let requestUrl;
    try {
      requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    } catch {
      sendJson(response, 400, { error: 'INVALID_REQUEST_URL' });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }

    const verificationMatch = requestUrl.pathname.match(/^\/kyc\/verifications\/([^/]+)$/);
    const decisionMatch = requestUrl.pathname.match(/^\/kyc\/verifications\/([^/]+)\/decision$/);
    const walletMatch = requestUrl.pathname.match(/^\/wallets\/([^/]+)$/);

    try {
      const store = await storePromise;

      if (request.method === 'POST' && requestUrl.pathname === '/kyc/verifications') {
        const verification = createVerification(await readJson(request), store);
        sendJson(response, 201, verification);
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/support/cases') {
        sendJson(response, 200, [...store.supportCases.values()]);
        return;
      }

      if (request.method === 'GET' && verificationMatch) {
        const id = decodeId(verificationMatch[1]);
        const verification = id === null ? undefined : store.verifications.get(id);
        if (!verification) throw new ApiError(404, 'NOT_FOUND');
        sendJson(response, 200, verification);
        return;
      }

      if (request.method === 'POST' && decisionMatch) {
        const id = decodeId(decisionMatch[1]);
        if (id === null) throw new ApiError(404, 'NOT_FOUND');
        const verification = decideVerification(await readJson(request), id, store);
        sendJson(response, 200, verification);
        return;
      }

      if (request.method === 'GET' && walletMatch) {
        const id = decodeId(walletMatch[1]);
        const wallet = id === null ? undefined : store.wallets.get(id);
        if (!wallet) throw new ApiError(404, 'NOT_FOUND');
        sendJson(response, 200, wallet);
        return;
      }

      throw new ApiError(404, 'ROUTE_NOT_FOUND');
    } catch (error) {
      if (error instanceof ApiError) {
        sendJson(response, error.status, { error: error.code });
        return;
      }

      console.error('W1 local JSON database request failed:', error);
      if (!response.headersSent) sendJson(response, 500, { error: 'INTERNAL_SERVER_ERROR' });
      else response.destroy(error);
    }
  };
}
