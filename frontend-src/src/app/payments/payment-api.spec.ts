import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { PaymentApi, PaymentContractError, CreatePaymentRequest } from './payment-api';

describe('PaymentApi', () => {
  let api: PaymentApi;
  let http: HttpTestingController;

  const request: CreatePaymentRequest = {
    walletId: 'wallet-demo',
    recipient: 'contact-demo',
    amountCents: 1500,
    currency: 'PEN',
  };
  const payment = {
    id: 'payment-001',
    wallet_id: 'wallet-demo',
    recipient: 'contact-demo',
    amount: 15,
    status: 'PENDING',
    scenario: 'APPROVED',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PaymentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts cents in PEN with the idempotency header and accepts 202 PENDING', () => {
    let result: unknown;
    api.create(request, 'attempt-001').subscribe((value) => (result = value));

    const req = http.expectOne(`${environment.w2ApiBaseUrl}/payments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('attempt-001');
    expect(req.request.body).toEqual(request);
    req.flush(payment, { status: 202, statusText: 'Accepted' });

    expect(result).toEqual({ httpStatus: 202, payment });
  });

  it('resolves a timed-out payment by its existing id without a body', () => {
    let result: unknown;
    api.resolvePayment('payment-001').subscribe((value) => (result = value));

    const req = http.expectOne(`${environment.w2ApiBaseUrl}/payments/payment-001/resolve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ ...payment, status: 'SUCCEEDED' }, { status: 200, statusText: 'OK' });

    expect(result).toEqual({ httpStatus: 200, payment: { ...payment, status: 'SUCCEEDED' } });
  });

  it('lists payments using the selected walletId and accepts an empty history', () => {
    let result: unknown;
    api.listPayments('wallet-demo').subscribe((value) => (result = value));

    const req = http.expectOne(`${environment.w2ApiBaseUrl}/payments?walletId=wallet-demo`);
    expect(req.request.method).toBe('GET');
    req.flush([payment]);
    expect(result).toEqual([payment]);

    let emptyResult: unknown;
    api.listPayments('wallet-demo').subscribe((value) => (emptyResult = value));
    http.expectOne(`${environment.w2ApiBaseUrl}/payments?walletId=wallet-demo`).flush([]);
    expect(emptyResult).toEqual([]);
  });

  it('rejects a history record that belongs to another wallet or has invalid amount', () => {
    let receivedError: unknown;
    api.listPayments('wallet-demo').subscribe({ error: (error) => (receivedError = error) });
    http.expectOne(`${environment.w2ApiBaseUrl}/payments?walletId=wallet-demo`).flush([
      { ...payment, wallet_id: 'another-wallet', amount: 1500 },
    ]);
    expect(receivedError).toBeInstanceOf(PaymentContractError);
  });

  it('rejects malformed payment responses instead of treating them as success', () => {
    let receivedError: unknown;
    api.create(request, 'attempt-002').subscribe({ error: (error) => (receivedError = error) });
    http.expectOne(`${environment.w2ApiBaseUrl}/payments`).flush({ id: 'payment-001' }, { status: 202, statusText: 'Accepted' });
    expect(receivedError).toBeInstanceOf(PaymentContractError);
  });
});
