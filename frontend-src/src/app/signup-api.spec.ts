import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../environments/environment';
import { SignupApi, SignupContractError, SignupRequest } from './signup-api';

describe('SignupApi', () => {
  let api: SignupApi;
  let http: HttpTestingController;

  const requestBody: SignupRequest = {
    documentType: 'DNI',
    document: '00000000',
    password: 'test-password',
    email: 'usuario@example.test',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SignupApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the W0 request and accepts only the approved signup response', () => {
    let response: unknown;
    api.signup(requestBody).subscribe((value) => (response = value));

    const req = http.expectOne(environment.signupEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    req.flush(
      { account_id: 'account-001', status: 'REGISTERED' },
      { status: 201, statusText: 'Created' },
    );

    expect(response).toEqual({ account_id: 'account-001', status: 'REGISTERED' });
  });

  it('rejects a Beeceptor response that does not match the W0 success contract', () => {
    let receivedError: unknown;
    api.signup(requestBody).subscribe({ error: (error) => (receivedError = error) });

    const req = http.expectOne(environment.signupEndpoint);
    req.flush({ message: 'REGISTERED' }, { status: 200, statusText: 'OK' });

    expect(receivedError).toBeInstanceOf(SignupContractError);
  });
});
