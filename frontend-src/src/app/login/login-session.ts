import { Injectable, signal } from '@angular/core';
import { LoginResponse } from './login-api';

export interface ActiveLoginSession {
  accessToken: string;
  expiresAt: number;
  walletId: string;
}

@Injectable({ providedIn: 'root' })
export class LoginSession {
  private readonly current = signal<ActiveLoginSession | null>(null);
  readonly session = this.current.asReadonly();

  start(response: LoginResponse): void {
    this.current.set({
      accessToken: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
      walletId: response.wallet_id,
    });
  }

  clear(): void {
    this.current.set(null);
  }
}
