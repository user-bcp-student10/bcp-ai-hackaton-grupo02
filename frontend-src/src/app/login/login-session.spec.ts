import { TestBed } from '@angular/core/testing';
import { LoginResponse } from './login-api';
import { LoginSession } from './login-session';

describe('LoginSession', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('keeps the access token only in in-memory state and clears it on logout', () => {
    const session = TestBed.inject(LoginSession);
    const response: LoginResponse = {
      access_token: 'fake-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      account_id: 'account-001',
    };

    session.start(response);
    expect(session.session()?.accessToken).toBe('fake-access-token');
    expect(session.session()?.accountId).toBe('account-001');

    session.clear();
    expect(session.session()).toBeNull();
  });
});
