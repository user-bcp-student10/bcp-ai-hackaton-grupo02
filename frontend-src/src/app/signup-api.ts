import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { DocumentType } from './document-type';

export interface SignupRequest {
  documentType: DocumentType;
  document: string;
  password: string;
  email: string;
}

export interface SignupResponse {
  account_id: string;
  status: 'REGISTERED';
}

export class SignupContractError extends Error {
  constructor() {
    super('La respuesta del servicio de registro no coincide con el contrato W0.');
    this.name = 'SignupContractError';
  }
}

@Injectable({ providedIn: 'root' })
export class SignupApi {
  private readonly http = inject(HttpClient);

  signup(request: SignupRequest): Observable<SignupResponse> {
    return this.http
      .post<unknown>(environment.signupEndpoint, request, { observe: 'response' })
      .pipe(
        map((response) => {
          const body = response.body as Partial<SignupResponse> | null;
          if (
            response.status !== 200 ||
            !body ||
            typeof body.account_id !== 'string' ||
            body.account_id.length === 0 ||
            body.status !== 'REGISTERED'
          ) {
            throw new SignupContractError();
          }

          return { account_id: body.account_id, status: 'REGISTERED' };
        }),
      );
  }
}
