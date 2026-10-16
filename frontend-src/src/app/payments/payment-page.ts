import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginSession } from '../login/login-session';
import { environment } from '../../environments/environment';
import {
  CreatePaymentRequest,
  MAX_PAYMENT_AMOUNT_CENTS,
  MAX_PAYMENT_AMOUNT_PEN,
  PaymentApi,
  PaymentContractError,
  PaymentReceipt,
  PaymentRecipient,
  PaymentResult,
  PaymentStatus,
} from './payment-api';

type PaymentStage =
  | 'editing'
  | 'review'
  | 'submitting'
  | 'pending'
  | 'resolving'
  | 'uncertain'
  | 'succeeded'
  | 'rejected'
  | 'expired';

@Component({
  selector: 'app-payment-page',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './payment-page.html',
  styleUrl: './payment-page.css',
})
export class PaymentPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly paymentApi = inject(PaymentApi);
  private readonly loginSession = inject(LoginSession);
  private currentRequest: CreatePaymentRequest | null = null;
  private idempotencyKey: string | null = null;

  protected readonly maxAmountPen = MAX_PAYMENT_AMOUNT_PEN;
  protected readonly stage = signal<PaymentStage>('editing');
  protected readonly paymentId = signal('');
  protected readonly paymentStatus = signal<PaymentStatus | null>(null);
  protected readonly message = signal('');
  protected readonly receipt = signal<PaymentReceipt | null>(null);
  protected readonly receiptBusy = signal(false);
  protected readonly formSubmitted = signal(false);

  protected readonly paymentForm = this.formBuilder.nonNullable.group({
    recipient: this.formBuilder.nonNullable.control<PaymentRecipient>('contact-demo', Validators.required),
    amountPen: this.formBuilder.nonNullable.control(15, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(MAX_PAYMENT_AMOUNT_PEN),
      (control: { value: number }) =>
        Number.isFinite(control.value) && Math.round(control.value * 100) === control.value * 100
          ? null
          : { minorUnit: true },
    ]),
  });

  protected get walletId(): string {
    return environment.w2WalletId;
  }

  protected get amountError(): string {
    const control = this.paymentForm.controls.amountPen;
    if (control.hasError('required') || control.hasError('min')) return 'Ingresa un monto mayor que S/ 0.00.';
    if (control.hasError('max')) return `El monto máximo permitido es S/ ${this.maxAmountPen.toFixed(2)}.`;
    if (control.hasError('minorUnit')) return 'Usa como máximo dos decimales.';
    return '';
  }

  protected reviewPayment(): void {
    this.formSubmitted.set(true);
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const values = this.paymentForm.getRawValue();
    const amountCents = Math.round(values.amountPen * 100);
    if (amountCents < 1 || amountCents > MAX_PAYMENT_AMOUNT_CENTS) return;

    this.currentRequest = {
      walletId: this.walletId,
      recipient: values.recipient,
      amountCents,
      currency: 'PEN',
    };
    this.idempotencyKey ??= this.createIdempotencyKey();
    this.message.set('');
    this.receipt.set(null);
    this.paymentId.set('');
    this.paymentStatus.set(null);
    this.stage.set('review');
  }

  protected editPayment(): void {
    if (this.stage() === 'review') {
      this.currentRequest = null;
      this.idempotencyKey = null;
      this.stage.set('editing');
    }
  }

  protected confirmPayment(): void {
    if (!this.currentRequest || !this.idempotencyKey || this.stage() !== 'review') return;
    this.submitSameAttempt();
  }

  protected checkPendingPayment(): void {
    const id = this.paymentId();
    if (!id || this.stage() !== 'pending') return;

    this.stage.set('resolving');
    this.paymentApi
      .getPayment(id)
      .pipe(finalize(() => this.finishResolving()))
      .subscribe({
        next: (result) => this.applyPayment(result),
        error: () => {
          this.stage.set('pending');
          this.message.set('No se pudo consultar el estado. El pago sigue sin confirmarse; vuelve a intentarlo.');
        },
      });
  }

  protected resolveUncertainPayment(): void {
    const id = this.paymentId();
    if (!id) {
      this.submitSameAttempt();
      return;
    }

    this.stage.set('resolving');
    this.paymentApi
      .resolvePayment(id)
      .pipe(finalize(() => this.finishResolving()))
      .subscribe({
        next: (result) => this.applyPayment(result),
        error: () => {
          this.stage.set('uncertain');
          this.message.set('El resultado todavía no está confirmado. Puedes volver a consultar este mismo pago.');
        },
      });
  }

  protected loadReceipt(): void {
    const id = this.paymentId();
    if (!id || this.stage() !== 'succeeded' || this.receiptBusy()) return;

    this.receiptBusy.set(true);
    this.paymentApi
      .getReceipt(id)
      .pipe(finalize(() => this.receiptBusy.set(false)))
      .subscribe({
        next: (receipt) => this.receipt.set(receipt),
        error: () => this.message.set('El comprobante todavía no está disponible. Inténtalo nuevamente.'),
      });
  }

  protected startAnotherPayment(): void {
    if (!['succeeded', 'rejected', 'expired'].includes(this.stage())) return;
    this.currentRequest = null;
    this.idempotencyKey = null;
    this.paymentId.set('');
    this.paymentStatus.set(null);
    this.receipt.set(null);
    this.message.set('');
    this.formSubmitted.set(false);
    this.paymentForm.reset({ recipient: 'contact-demo', amountPen: 15 });
    this.stage.set('editing');
  }

  protected isFieldInvalid(): boolean {
    const control = this.paymentForm.controls.amountPen;
    return control.invalid && (control.touched || this.formSubmitted());
  }

  protected recipientLabel(recipient: PaymentRecipient): string {
    return recipient === 'contact-demo' ? 'Contacto de prueba' : 'Comercio de prueba';
  }

  private submitSameAttempt(): void {
    if (!this.currentRequest || !this.idempotencyKey) return;
    this.stage.set('submitting');
    this.message.set('');
    this.paymentApi
      .create(this.currentRequest, this.idempotencyKey)
      .pipe(finalize(() => {
        if (this.stage() === 'submitting') this.stage.set('uncertain');
      }))
      .subscribe({
        next: (result) => this.applyPayment(result),
        error: (error: unknown) => this.handleCreateError(error),
      });
  }

  private handleCreateError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.stage.set('expired');
      this.message.set('El pago expiró y no se completó. Puedes iniciar un nuevo intento.');
      return;
    }

    if (error instanceof HttpErrorResponse && error.status === 504) {
      const id = this.readPaymentId(error.error);
      this.paymentId.set(id);
      this.paymentStatus.set(null);
      this.stage.set('uncertain');
      this.message.set('La respuesta tardó más de lo esperado. Estamos verificando el mismo pago.');
      if (id) this.resolveUncertainPayment();
      return;
    }

    if (error instanceof PaymentContractError) {
      this.stage.set('uncertain');
      this.message.set('La respuesta no permite confirmar el resultado. No vuelvas a crear otro pago; consulta de nuevo.');
      return;
    }

    this.stage.set('rejected');
    this.message.set(this.safeErrorMessage(error));
  }

  private applyPayment(result: PaymentResult): void {
    this.paymentId.set(result.payment.id);
    this.paymentStatus.set(result.payment.status);
    this.receipt.set(null);

    switch (result.payment.status) {
      case 'PENDING':
        this.stage.set('pending');
        this.message.set('El pago está en proceso. Su resultado todavía no es definitivo.');
        break;
      case 'SUCCEEDED':
        this.stage.set('succeeded');
        this.message.set('El pago se completó correctamente.');
        break;
      case 'REJECTED':
        this.stage.set('rejected');
        this.message.set('El pago no se completó. Puedes volver a intentarlo.');
        break;
      case 'REVERSED':
        this.stage.set('rejected');
        this.message.set('El pago fue revertido y no está completado.');
        break;
    }
  }

  private finishResolving(): void {
    if (this.stage() === 'resolving') this.stage.set('uncertain');
  }

  private readPaymentId(value: unknown): string {
    if (!value || typeof value !== 'object' || !('paymentId' in value)) return '';
    const id = (value as { paymentId?: unknown }).paymentId;
    return typeof id === 'string' ? id : '';
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Revisa el monto, el destino y los datos del pago.';
        case 404:
          return 'No se encontró la wallet o el destino de prueba.';
        case 409:
          return 'No se pudo procesar el pago. Revisa el saldo o inicia un intento nuevo.';
        case 410:
          return 'El recurso de pago expiró. Revisa los datos antes de volver a intentarlo.';
        case 413:
          return 'La solicitud supera el tamaño permitido.';
        case 429:
          return 'Se alcanzó el límite de intentos. Espera un momento.';
        case 503:
          return 'El proveedor no está disponible. No se confirmó ningún pago.';
        default:
          return 'No se pudo completar el pago. Inténtalo nuevamente.';
      }
    }
    return 'No se pudo completar el pago. Inténtalo nuevamente.';
  }

  private createIdempotencyKey(): string {
    return globalThis.crypto.randomUUID();
  }
}
