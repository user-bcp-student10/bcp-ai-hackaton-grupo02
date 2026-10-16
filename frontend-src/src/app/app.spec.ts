import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('provides the router outlet for the W0 flows', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('defines a login path separate from signup', () => {
    expect(routes.some((route) => route.path === 'login')).toBe(true);
    expect(routes.some((route) => route.path === 'signup')).toBe(true);
    expect(routes.some((route) => route.path === 'payments/new')).toBe(true);
    expect(routes.some((route) => route.path === 'payments/history')).toBe(true);
    expect(routes.find((route) => route.path === 'payments/new')?.component).not.toBe(
      routes.find((route) => route.path === 'payments/history')?.component,
    );
  });
});
