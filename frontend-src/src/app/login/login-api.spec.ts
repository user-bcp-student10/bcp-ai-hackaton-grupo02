import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { LoginApi, LoginContractError, LoginRequest } from './login-api';

describe('LoginApi', () => {
  let api: LoginApi;
  let http: HttpTestingController;

  const requestBody: LoginRequest = {
    documentType: 'DNI',
    document: '00000000',
    password: 'test-password',
  };

  const activeResponse = {
    access_token: 'fake-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    wallet_id: 'wallet-001',
    wallet_status: 'ACTIVE',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(LoginApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the approved DNI login body and accepts an HTTP 200 ACTIVE wallet', () => {
    let response: unknown;
    api.login(requestBody).subscribe((value) => (response = value));

    const req = http.expectOne(environment.loginEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    req.flush(activeResponse, { status: 200, statusText: 'OK' });

    expect(response).toEqual(activeResponse);
  });

  it('rejects malformed successful responses instead of treating them as login success', () => {
    let receivedError: unknown;
    api.login(requestBody).subscribe({ error: (error) => (receivedError = error) });

    const req = http.expectOne(environment.loginEndpoint);
    req.flush({ message: 'login ok' }, { status: 200, statusText: 'OK' });

    expect(receivedError).toBeInstanceOf(LoginContractError);
  });

  it('preserves valid W0 wallet states for the UI to interpret', () => {
    let response: unknown;
    api.login(requestBody).subscribe((value) => (response = value));

    const req = http.expectOne(environment.loginEndpoint);
    req.flush({ ...activeResponse, wallet_status: 'PENDING' }, { status: 200, statusText: 'OK' });

    expect(response).toEqual({ ...activeResponse, wallet_status: 'PENDING' });
  });
});
