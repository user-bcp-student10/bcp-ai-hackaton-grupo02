import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApp } from '../src/app.js';

const fixturesDirectory = new URL('../../../db/', import.meta.url);

async function readFixture(name) {
  const fixture = JSON.parse(await readFile(new URL(name, fixturesDirectory), 'utf8'));
  return fixture.success.return;
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}

async function startApp(t) {
  const server = createServer(createApp());
  const baseUrl = await listen(server);
  t.after(() => close(server));
  return baseUrl;
}

async function call(baseUrl, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
  };
}

test('loads W1 seed responses from the shared JSON fixtures', async (t) => {
  const baseUrl = await startApp(t);
  const [createFixture, getFixture, decisionFixture, walletFixture, casesFixture] = await Promise.all([
    readFixture('create-wallet-with-simulated-kyc.json'),
    readFixture('get-kyc-verification.json'),
    readFixture('resolve-human-review.json'),
    readFixture('wallet-balances.json'),
    readFixture('open-and-resolved-support-cases.json'),
  ]);

  assert.deepEqual((await call(baseUrl, '/kyc/verifications/kyc-001')).body, createFixture);
  assert.deepEqual((await call(baseUrl, '/kyc/verifications/kyc-001')).body, getFixture);
  assert.deepEqual((await call(baseUrl, '/kyc/verifications/kyc-002')).body, decisionFixture);
  assert.deepEqual((await call(baseUrl, '/wallets/wallet-demo')).body, walletFixture);
  assert.deepEqual((await call(baseUrl, '/support/cases')).body, casesFixture);
});

test('creates local wallets and keeps KYC, wallet and support state in sync', async (t) => {
  const baseUrl = await startApp(t);
  const created = await call(baseUrl, '/kyc/verifications', {
    method: 'POST',
    body: {
      documentType: 'TEST',
      document: 'TEST-LOCAL-APPROVED',
      password: 'test-password',
    },
  });

  assert.equal(created.status, 201);
  assert.deepEqual(created.body, {
    id: created.body.id,
    wallet_id: created.body.wallet_id,
    scenario: 'APPROVED',
    status: 'ACTIVE',
  });
  assert.match(created.body.id, /^kyc-/);
  assert.match(created.body.wallet_id, /^wallet-/);
  assert.deepEqual((await call(baseUrl, `/wallets/${created.body.wallet_id}`)).body, {
    id: created.body.wallet_id,
    status: 'ACTIVE',
    balance: 0,
    reserved: 0,
    currency: 'PEN',
  });
  assert.deepEqual(
    (await call(baseUrl, `/kyc/verifications/${created.body.id}`)).body,
    created.body,
  );

  const pending = await call(baseUrl, '/kyc/verifications', {
    method: 'POST',
    body: {
      documentType: 'TEST',
      document: 'TEST-LOCAL-REVIEW',
      password: 'test-password',
      scenario: 'MANUAL_REVIEW',
    },
  });
  assert.equal(pending.status, 201);
  assert.equal(pending.body.status, 'PENDING');

  const casesBeforeDecision = await call(baseUrl, '/support/cases');
  const pendingCase = casesBeforeDecision.body.find(
    (supportCase) => supportCase.resource === pending.body.id,
  );
  assert.equal(pendingCase.status, 'OPEN');

  const decision = await call(
    baseUrl,
    `/kyc/verifications/${pending.body.id}/decision`,
    { method: 'POST', body: { decision: 'ACTIVE' } },
  );
  assert.equal(decision.status, 200);
  assert.equal(decision.body.status, 'ACTIVE');
  assert.equal(
    (await call(baseUrl, `/wallets/${pending.body.wallet_id}`)).body.status,
    'ACTIVE',
  );
  const casesAfterDecision = await call(baseUrl, '/support/cases');
  assert.equal(
    casesAfterDecision.body.find((supportCase) => supportCase.id === pendingCase.id).status,
    'RESOLVED',
  );
  assert.equal(
    (await call(baseUrl, `/kyc/verifications/${pending.body.id}/decision`, {
      method: 'POST',
      body: { decision: 'ACTIVE' },
    })).status,
    200,
  );
  assert.deepEqual(
    (await call(baseUrl, `/kyc/verifications/${pending.body.id}/decision`, {
      method: 'POST',
      body: { decision: 'REJECTED' },
    })).body,
    { error: 'DECISION_CONFLICT' },
  );
});

test('supports rejected and unavailable provider scenarios without remote calls', async (t) => {
  const baseUrl = await startApp(t);
  const rejected = await call(baseUrl, '/kyc/verifications', {
    method: 'POST',
    body: {
      documentType: 'TEST',
      document: 'TEST-LOCAL-REJECTED',
      password: 'test-password',
      scenario: 'REJECTED',
    },
  });

  assert.equal(rejected.status, 201);
  assert.equal(rejected.body.status, 'REJECTED');
  assert.equal(
    (await call(baseUrl, `/wallets/${rejected.body.wallet_id}`)).body.status,
    'REJECTED',
  );
  assert.deepEqual(
    await call(baseUrl, '/kyc/verifications', {
      method: 'POST',
      body: {
        documentType: 'TEST',
        document: 'TEST-LOCAL-UNAVAILABLE',
        password: 'test-password',
        scenario: 'UNAVAILABLE',
      },
    }),
    { status: 503, body: { error: 'KYC_UNAVAILABLE' } },
  );
});

test('validates request bodies and returns local not-found errors', async (t) => {
  const baseUrl = await startApp(t);

  for (const body of [
    {},
    { documentType: 'DNI', document: '123', password: 'test' },
    { documentType: 'TEST', document: 'REAL-001', password: 'test' },
    { documentType: 'TEST', document: 'TEST-001', password: '' },
  ]) {
    assert.equal(
      (await call(baseUrl, '/kyc/verifications', { method: 'POST', body })).status,
      400,
    );
  }

  assert.deepEqual(
    await call(baseUrl, '/kyc/verifications', {
      method: 'POST',
      body: {
        documentType: 'TEST',
        document: 'TEST-INVALID-SCENARIO',
        password: 'test-password',
        scenario: 'UNKNOWN',
      },
    }),
    { status: 400, body: { error: 'INVALID_SCENARIO' } },
  );
  assert.deepEqual(
    await call(baseUrl, '/kyc/verifications/unknown'),
    { status: 404, body: { error: 'NOT_FOUND' } },
  );
  assert.deepEqual(
    await call(baseUrl, '/wallets/unknown'),
    { status: 404, body: { error: 'NOT_FOUND' } },
  );
  assert.deepEqual(
    await call(baseUrl, '/kyc/verifications/unknown/decision', {
      method: 'POST',
      body: { decision: 'ACTIVE' },
    }),
    { status: 404, body: { error: 'NOT_FOUND' } },
  );
  assert.deepEqual(
    await call(baseUrl, '/kyc/verifications/kyc-001/decision', {
      method: 'POST',
      body: { decision: 'PENDING' },
    }),
    { status: 400, body: { error: 'INVALID_DECISION' } },
  );
});

test('keeps health local and rejects unsupported routes', async (t) => {
  const baseUrl = await startApp(t);

  assert.deepEqual(await call(baseUrl, '/health'), {
    status: 200,
    body: { status: 'ok' },
  });
  assert.deepEqual(await call(baseUrl, '/payments'), {
    status: 404,
    body: { error: 'ROUTE_NOT_FOUND' },
  });
});
