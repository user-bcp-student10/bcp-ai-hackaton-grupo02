import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PaymentApi, PaymentReceipt, WalletPayment } from './payment-api';
import { PaymentHistoryPage } from './payment-history-page';

describe('PaymentHistoryPage', () => {
  let api: { listPayments: ReturnType<typeof vi.fn>; getReceipt: ReturnType<typeof vi.fn> };
  let fixture: ReturnType<typeof TestBed.createComponent<PaymentHistoryPage>>;

  beforeEach(async () => {
    api = { listPayments: vi.fn(), getReceipt: vi.fn() };
    api.listPayments.mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [PaymentHistoryPage],
      providers: [{ provide: PaymentApi, useValue: api }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PaymentHistoryPage);
  });

  it('loads only the configured wallet history and shows the empty state', () => {
    fixture.detectChanges();
    expect(api.listPayments).toHaveBeenCalledWith('wallet-demo');
    expect(fixture.nativeElement.textContent).toContain('Aún no hay pagos');
  });

  it('renders the payment reference, destination, cents as PEN, and terminal status', () => {
    const payment: WalletPayment = {
      id: 'payment-001',
      wallet_id: 'wallet-demo',
      recipient: 'contact-demo',
      amount: 1500,
      status: 'SUCCEEDED',
      scenario: 'APPROVED',
    };
    api.listPayments.mockReturnValue(of([payment]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('payment-001');
    expect(fixture.nativeElement.textContent).toContain('Contacto de prueba');
    expect(fixture.nativeElement.textContent).toContain('S/ 15.00');
    expect(fixture.nativeElement.textContent).toContain('Completado');
  });

  it('loads a receipt only for a successful payment', () => {
    const payment: WalletPayment = {
      id: 'payment-002',
      wallet_id: 'wallet-demo',
      recipient: 'merchant-demo',
      amount: 2200,
      status: 'SUCCEEDED',
    };
    const receipt: PaymentReceipt = {
      receiptId: 'receipt-002',
      paymentId: 'payment-002',
      amountCents: 2200,
      currency: 'PEN',
      recipient: 'merchant-demo',
      status: 'SUCCEEDED',
    };
    api.listPayments.mockReturnValue(of([payment]));
    api.getReceipt.mockReturnValue(of(receipt));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.getReceipt).toHaveBeenCalledWith('payment-002');
    expect(fixture.nativeElement.textContent).toContain('receipt-002');
  });

  it('shows a safe message when history loading fails', () => {
    api.listPayments.mockReturnValue(throwError(() => new Error('sensitive backend detail')));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo consultar el historial');
    expect(fixture.nativeElement.textContent).not.toContain('sensitive backend detail');
  });
});
