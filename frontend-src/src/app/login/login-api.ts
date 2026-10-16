import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentType } from '../document-type';

export interface LoginRequest {
  documentType: DocumentType;
  document: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  account_id: string;
}

export class LoginContractError extends Error {
  constructor() {
    super('La respuesta del servicio de inicio de sesión no coincide con el contrato W0.');
    this.name = 'LoginContractError';
  }
}

@Injectable({ providedIn: 'root' })
export class LoginApi {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<unknown>(environment.loginEndpoint, request, { observe: 'response' })
      .pipe(
        map((response) => {
          const body = response.body as Partial<LoginResponse> | null;
          if (
            response.status !== 200 ||
            !body ||
            typeof body.access_token !== 'string' ||
            body.access_token.length === 0 ||
            body.token_type !== 'Bearer' ||
            typeof body.expires_in !== 'number' ||
            !Number.isFinite(body.expires_in) ||
            body.expires_in <= 0 ||
            typeof body.account_id !== 'string' ||
            body.account_id.length === 0
          ) {
            throw new LoginContractError();
          }

          return {
            access_token: body.access_token,
            token_type: 'Bearer',
            expires_in: body.expires_in,
            account_id: body.account_id,
          };
        }),
      );
  }
}
