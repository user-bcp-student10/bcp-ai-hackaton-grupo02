import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginApi, LoginContractError, LoginResponse, WalletStatus } from './login-api';
import { LoginSession } from './login-session';
import { DOCUMENT_TYPES, DocumentType } from '../document-type';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly loginApi = inject(LoginApi);
  private readonly session = inject(LoginSession);

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly loginForm = this.formBuilder.nonNullable.group({
    documentType: this.formBuilder.nonNullable.control<DocumentType>('DNI', Validators.required),
    document: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly activeWallet = signal<{ walletId: string } | null>(null);

  protected submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.activeWallet.set(null);

    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const values = this.loginForm.getRawValue();
    this.isSubmitting.set(true);
    this.loginApi
      .login(values)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => this.handleResponse(response),
        error: (error: unknown) => {
          this.session.clear();
          this.errorMessage.set(this.safeErrorMessage(error));
        },
      });
  }

  protected hasFieldError(field: 'documentType' | 'document' | 'password'): boolean {
    const control = this.loginForm.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(field: 'documentType' | 'document' | 'password'): string {
    const control = this.loginForm.controls[field];
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    return '';
  }

  protected logout(): void {
    this.session.clear();
    this.activeWallet.set(null);
    this.loginForm.reset();
    this.submitted.set(false);
  }

  private handleResponse(response: LoginResponse): void {
    this.loginForm.controls.password.reset();
    if (response.wallet_status !== 'ACTIVE') {
      this.session.clear();
      this.errorMessage.set(this.walletStatusMessage(response.wallet_status));
      return;
    }

    this.session.start(response);
    this.activeWallet.set({ walletId: response.wallet_id });
  }

  private walletStatusMessage(status: WalletStatus): string {
    if (status === 'PENDING') {
      return 'No puedes continuar: la wallet está en estado PENDING y requiere aprobación.';
    }
    return 'No puedes continuar: la wallet está en estado REJECTED y no está disponible.';
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof LoginContractError) {
      return 'El servicio respondió de forma inesperada. Inténtalo más tarde.';
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Revisa el tipo y número de documento.';
        case 401:
          return 'Documento o contraseña incorrectos.';
        case 413:
          return 'La solicitud supera el tamaño permitido.';
        case 429:
          return 'Se alcanzó el límite de intentos. Espera un momento.';
        case 503:
          return 'El servicio de autenticación no está disponible. Inténtalo más tarde.';
        default:
          return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
      }
    }

    return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
  }
}
