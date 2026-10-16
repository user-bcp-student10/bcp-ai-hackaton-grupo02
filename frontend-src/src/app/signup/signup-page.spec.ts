import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SignupApi, SignupRequest } from '../signup-api';
import { SignupPage } from './signup-page';

describe('SignupPage', () => {
  let signup: ReturnType<typeof vi.fn>;
  let fixture: ReturnType<typeof TestBed.createComponent<SignupPage>>;

  function setInput(id: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setSelect(id: string, value: string): void {
    const select = fixture.nativeElement.querySelector(`#${id}`) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    signup = vi.fn();
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [{ provide: SignupApi, useValue: { signup } }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();
  });

  it('offers only DNI/CE and keeps the document control as text', () => {
    const select = fixture.nativeElement.querySelector('#documentType') as HTMLSelectElement;
    const document = fixture.nativeElement.querySelector('#document') as HTMLInputElement;

    expect(Array.from(select.options).map((option) => option.value)).toEqual(['DNI', 'CE']);
    expect(document.type).toBe('text');
  });

  it('requires a document value before sending the request', () => {
    setInput('document', '');
    setInput('email', 'usuario@example.test');
    setInput('password', 'test-password');
    submit();

    expect(signup).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('obligatorio');
  });

  it('sends the approved W0 request and renders the REGISTERED response', () => {
    signup.mockReturnValue(of({ account_id: 'account-001', status: 'REGISTERED' }));
    setSelect('documentType', 'CE');
    setInput('document', '00000001');
    setInput('email', 'usuario@example.test');
    setInput('password', 'test-password');
    submit();

    const expectedRequest: SignupRequest = {
      documentType: 'CE',
      document: '00000001',
      password: 'test-password',
      email: 'usuario@example.test',
    };
    expect(signup).toHaveBeenCalledWith(expectedRequest);
    expect(fixture.nativeElement.textContent).toContain('REGISTERED');
    expect(fixture.nativeElement.textContent).toContain('account-001');
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement | null)?.value ?? '').toBe('');
  });

  it('maps backend errors to safe user-facing messages', () => {
    signup.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'internal database detail' } })),
    );
    setSelect('documentType', 'DNI');
    setInput('document', '00000002');
    setInput('email', 'usuario@example.test');
    setInput('password', 'test-password');
    submit();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ya existe una cuenta con esos datos.');
    expect(text).not.toContain('internal database detail');
  });
});
