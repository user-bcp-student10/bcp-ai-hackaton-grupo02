import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export const MAX_PAYMENT_AMOUNT_PEN = 2000;
export const MAX_PAYMENT_AMOUNT_CENTS = MAX_PAYMENT_AMOUNT_PEN * 100;

export type PaymentRecipient = 'contact-demo' | 'merchant-demo';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'REJECTED' | 'REVERSED';

export interface CreatePaymentRequest {
  walletId: string;
  recipient: PaymentRecipient;
  amountCents: number;
  currency: 'PEN';
}

export interface PaymentRecord {
  id: string;
  wallet_id: string;
  recipient: PaymentRecipient;
  status: PaymentStatus;
  amount?: number | string;
  scenario?: string;
}

export interface PaymentReceipt {
  receiptId: string;
  paymentId: string;
  amountCents: number;
  currency: 'PEN';
  recipient: PaymentRecipient;
  status: 'SUCCEEDED' | 'REVERSED';
}

export interface PaymentResult {
  httpStatus: number;
  payment: PaymentRecord;
}

export class PaymentContractError extends Error {
  constructor() {
    super('La respuesta del servicio de pagos no coincide con el contrato W2.');
    this.name = 'PaymentContractError';
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.w2ApiBaseUrl.replace(/\/$/, '');

  create(request: CreatePaymentRequest, idempotencyKey: string): Observable<PaymentResult> {
    return this.http
      .post<unknown>(`${this.baseUrl}/payments`, request, {
        headers: { 'Idempotency-Key': idempotencyKey },
        observe: 'response',
      })
      .pipe(map((response) => this.parsePaymentResponse(response)));
  }

  getPayment(paymentId: string): Observable<PaymentResult> {
    return this.http
      .get<unknown>(`${this.baseUrl}/payments/${encodeURIComponent(paymentId)}`, { observe: 'response' })
      .pipe(map((response) => this.parsePaymentResponse(response)));
  }

  resolvePayment(paymentId: string): Observable<PaymentResult> {
    return this.http
      .post<unknown>(`${this.baseUrl}/payments/${encodeURIComponent(paymentId)}/resolve`, null, {
        observe: 'response',
      })
      .pipe(map((response) => this.parsePaymentResponse(response)));
  }

  getReceipt(paymentId: string): Observable<PaymentReceipt> {
    return this.http
      .get<unknown>(`${this.baseUrl}/payments/${encodeURIComponent(paymentId)}/receipt`)
      .pipe(map((body) => this.parseReceipt(body)));
  }

  private parsePaymentResponse(response: HttpResponse<unknown>): PaymentResult {
    const body = response.body as Partial<PaymentRecord> | null;
    const validStatus = ['PENDING', 'SUCCEEDED', 'REJECTED', 'REVERSED'].includes(String(body?.status));
    const validRecipient = ['contact-demo', 'merchant-demo'].includes(String(body?.recipient));
    if (
      (response.status !== 200 && response.status !== 202) ||
      !body ||
      typeof body.id !== 'string' ||
      body.id.length === 0 ||
      typeof body.wallet_id !== 'string' ||
      !validRecipient ||
      !validStatus
    ) {
      throw new PaymentContractError();
    }

    return {
      httpStatus: response.status,
      payment: {
        id: body.id,
        wallet_id: body.wallet_id,
        recipient: body.recipient as PaymentRecipient,
        status: body.status as PaymentStatus,
        amount: body.amount,
        scenario: body.scenario,
      },
    };
  }

  private parseReceipt(value: unknown): PaymentReceipt {
    const body = value as Partial<PaymentReceipt> | null;
    if (
      !body ||
      typeof body.receiptId !== 'string' ||
      typeof body.paymentId !== 'string' ||
      typeof body.amountCents !== 'number' ||
      body.currency !== 'PEN' ||
      !['contact-demo', 'merchant-demo'].includes(String(body.recipient)) ||
      !['SUCCEEDED', 'REVERSED'].includes(String(body.status))
    ) {
      throw new PaymentContractError();
    }
    return body as PaymentReceipt;
  }
}
