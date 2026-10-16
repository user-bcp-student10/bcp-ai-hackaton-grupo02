import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SignupApi, SignupContractError } from '../signup-api';
import { DOCUMENT_TYPES, DocumentType } from '../document-type';

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.css',
})
export class SignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly signupApi = inject(SignupApi);

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly signupForm = this.formBuilder.nonNullable.group({
    documentType: this.formBuilder.nonNullable.control<DocumentType>('DNI', Validators.required),
    document: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly registration = signal<{ account_id: string; status: 'REGISTERED' } | null>(null);

  protected submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.registration.set(null);

    if (this.signupForm.invalid || this.isSubmitting()) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const values = this.signupForm.getRawValue();
    this.isSubmitting.set(true);
    this.signupApi
      .signup(values)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.registration.set(response);
          this.signupForm.controls.password.reset();
        },
        error: (error: unknown) => this.errorMessage.set(this.safeErrorMessage(error)),
      });
  }

  protected hasFieldError(field: 'documentType' | 'document' | 'email' | 'password'): boolean {
    const control = this.signupForm.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(field: 'documentType' | 'document' | 'email' | 'password'): string {
    const control = this.signupForm.controls[field];
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (field === 'email' && control.hasError('email')) {
      return 'Escribe un correo electrónico válido.';
    }
    return '';
  }

  protected registerAnother(): void {
    this.registration.set(null);
    this.errorMessage.set('');
    this.submitted.set(false);
    this.signupForm.reset();
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof SignupContractError) {
      return 'El servicio respondió de forma inesperada. Inténtalo más tarde.';
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          return 'Revisa los datos del formulario e inténtalo de nuevo.';
        case 409:
          return 'Ya existe una cuenta con esos datos.';
        case 413:
          return 'La solicitud supera el tamaño permitido.';
        case 429:
          return 'Se alcanzó el límite de intentos. Espera un momento.';
        case 503:
          return 'El servicio de registro no está disponible. Inténtalo más tarde.';
        default:
          return 'No pudimos completar el registro. Inténtalo nuevamente.';
      }
    }

    return 'No pudimos completar el registro. Inténtalo nuevamente.';
  }
}
