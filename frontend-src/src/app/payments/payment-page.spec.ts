import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginSession } from '../login/login-session';
import { PaymentApi, CreatePaymentRequest, PaymentReceipt, PaymentResult } from './payment-api';
import { PaymentPage } from './payment-page';

describe('PaymentPage', () => {
  let api: { create: ReturnType<typeof vi.fn>; getPayment: ReturnType<typeof vi.fn>; resolvePayment: ReturnType<typeof vi.fn>; getReceipt: ReturnType<typeof vi.fn> };
  let fixture: ReturnType<typeof TestBed.createComponent<PaymentPage>>;

  function setInput(id: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(id: string, value: string): void {
    const select = fixture.nativeElement.querySelector(`#${id}`) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function click(selector: string): void {
    (fixture.nativeElement.querySelector(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    api = { create: vi.fn(), getPayment: vi.fn(), resolvePayment: vi.fn(), getReceipt: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PaymentPage],
      providers: [
        { provide: PaymentApi, useValue: api },
        LoginSession,
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PaymentPage);
    fixture.detectChanges();
  });

  it('blocks amounts above S/ 2,000 before sending and offers the documented recipients', () => {
    const recipient = fixture.nativeElement.querySelector('#recipient') as HTMLSelectElement;
    const amount = fixture.nativeElement.querySelector('#amountPen') as HTMLInputElement;
    expect(Array.from(recipient.options).map((option) => option.value)).toEqual(['contact-demo', 'merchant-demo']);
    expect(amount.max).toBe('2000');

    setInput('amountPen', '2000.01');
    click('button[type="submit"]');
    expect(api.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('máximo permitido es S/ 2000.00');
  });

  it('shows destination and amount for review before creating the payment', () => {
    setSelect('recipient', 'merchant-demo');
    setInput('amountPen', '20.50');
    click('button[type="submit"]');

    expect(fixture.nativeElement.textContent).toContain('Comercio de prueba');
    expect(fixture.nativeElement.textContent).toContain('S/ 20.50');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('sends integer PEN cents and a stable idempotency key after confirmation', () => {
    const result: PaymentResult = {
      httpStatus: 202,
      payment: { id: 'payment-001', wallet_id: 'wallet-demo', recipient: 'contact-demo', amount: 15, status: 'PENDING' },
    };
    api.create.mockReturnValue(of(result));
    setInput('amountPen', '15.25');
    click('button[type="submit"]');
    click('.action-row .primary-button');

    const [request, firstKey] = api.create.mock.calls[0] as [CreatePaymentRequest, string];
    expect(request).toEqual({ walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1525, currency: 'PEN' });
    expect(firstKey).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('en proceso');
  });

  it('treats HTTP 403 from payment creation as expired', () => {
    api.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    click('button[type="submit"]');
    click('.action-row .primary-button');

    expect(fixture.nativeElement.textContent).toContain('El intento expiró');
  });

  it('resolves a 504 with paymentId instead of declaring failure or creating another payment', () => {
    api.create.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 504,
      error: { paymentId: 'payment-timeout-001' },
    })));
    api.resolvePayment.mockReturnValue(of({
      httpStatus: 200,
      payment: { id: 'payment-timeout-001', wallet_id: 'wallet-demo', recipient: 'contact-demo', status: 'SUCCEEDED' },
    }));
    click('button[type="submit"]');
    click('.action-row .primary-button');

    expect(api.resolvePayment).toHaveBeenCalledWith('payment-timeout-001');
    expect(fixture.nativeElement.textContent).toContain('Pago exitoso');
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('retries an uncertain create with the same key and unchanged request when no paymentId was received', () => {
    api.create
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 504, error: {} })))
      .mockReturnValueOnce(of({
        httpStatus: 202,
        payment: { id: 'payment-retry-001', wallet_id: 'wallet-demo', recipient: 'contact-demo', status: 'PENDING' },
      }));
    setInput('amountPen', '25.00');
    click('button[type="submit"]');
    click('.action-row .primary-button');
    click('.state-panel .primary-button');

    const first = api.create.mock.calls[0] as [CreatePaymentRequest, string];
    const retry = api.create.mock.calls[1] as [CreatePaymentRequest, string];
    expect(retry[0]).toEqual(first[0]);
    expect(retry[1]).toBe(first[1]);
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('en proceso');
  });

  it('loads the receipt only after a successful payment', () => {
    api.create.mockReturnValue(of({
      httpStatus: 200,
      payment: { id: 'payment-002', wallet_id: 'wallet-demo', recipient: 'contact-demo', status: 'SUCCEEDED' },
    }));
    const receipt: PaymentReceipt = {
      receiptId: 'receipt-002',
      paymentId: 'payment-002',
      amountCents: 1500,
      currency: 'PEN',
      recipient: 'contact-demo',
      status: 'SUCCEEDED',
    };
    api.getReceipt.mockReturnValue(of(receipt));
    click('button[type="submit"]');
    click('.action-row .primary-button');
    click('button.secondary-button');

    expect(api.getReceipt).toHaveBeenCalledWith('payment-002');
    expect(fixture.nativeElement.textContent).toContain('receipt-002');
  });
});
