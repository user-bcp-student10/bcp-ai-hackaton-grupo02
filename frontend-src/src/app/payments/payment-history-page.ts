import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentApi, PaymentReceipt, PaymentStatus, WalletPayment } from './payment-api';

@Component({
  selector: 'app-payment-history-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './payment-history-page.html',
  styleUrl: './payment-history-page.css',
})
export class PaymentHistoryPage implements OnInit {
  private readonly paymentApi = inject(PaymentApi);
  protected readonly walletId = environment.w2WalletId;
  protected readonly payments = signal<WalletPayment[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly receipt = signal<PaymentReceipt | null>(null);
  protected readonly receiptPaymentId = signal('');

  ngOnInit(): void {
    this.loadHistory();
  }

  protected loadHistory(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.receipt.set(null);
    this.paymentApi
      .listPayments(this.walletId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (payments) => this.payments.set(payments),
        error: () => this.errorMessage.set('No se pudo consultar el historial. Inténtalo nuevamente.'),
      });
  }

  protected statusLabel(status: PaymentStatus): string {
    switch (status) {
      case 'PENDING': return 'En proceso';
      case 'SUCCEEDED': return 'Completado';
      case 'REJECTED': return 'Rechazado';
      case 'REVERSED': return 'Revertido';
    }
  }

  protected statusClass(status: PaymentStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  protected canLoadReceipt(status: PaymentStatus): boolean {
    return status === 'SUCCEEDED' || status === 'REVERSED';
  }

  protected loadReceipt(payment: WalletPayment): void {
    if (!this.canLoadReceipt(payment.status) || this.receiptPaymentId() === payment.id) return;
    this.receiptPaymentId.set(payment.id);
    this.receipt.set(null);
    this.errorMessage.set('');
    this.paymentApi
      .getReceipt(payment.id)
      .pipe(finalize(() => this.receiptPaymentId.set('')))
      .subscribe({
        next: (receipt) => this.receipt.set(receipt),
        error: () => this.errorMessage.set('El comprobante no está disponible. Inténtalo nuevamente.'),
      });
  }
}
