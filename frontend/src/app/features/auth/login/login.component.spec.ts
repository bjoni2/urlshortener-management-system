import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthResponse } from '../../../core/models/api.models';
import { LoginComponent } from './login.component';

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';

const SESSION: AuthResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: '1', email: 'jane@example.com', role: 'USER', enabled: true, createdAt: '2026-01-01T00:00:00Z' },
};

interface TemplateApi {
  form: {
    invalid: boolean;
    setValue(value: { email: string; password: string }): void;
    controls: { email: { touched: boolean }; password: { touched: boolean } };
  };
  submit(): void;
  serverError(): string | null;
  submitting(): boolean;
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let api: TemplateApi;
  let http: HttpTestingController;
  let navigated: string[];

  async function setUp(returnUrl: string | null = null) {
    localStorage.clear();
    navigated = [];

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } },
        },
      ],
    }).compileComponents();

    TestBed.inject(Router).navigateByUrl = ((url: string) => {
      navigated.push(url);
      return Promise.resolve(true);
    }) as Router['navigateByUrl'];

    fixture = TestBed.createComponent(LoginComponent);
    api = fixture.componentInstance as unknown as TemplateApi;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('renders the sign-in form', async () => {
    await setUp();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Welcome back');
    expect(element.querySelector('input[type="email"]')).not.toBeNull();
    expect(element.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('refuses to submit an empty form and marks the fields so the errors appear', async () => {
    await setUp();

    api.submit();

    http.expectNone(LOGIN_URL);
    expect(api.form.controls.email.touched).toBe(true);
    expect(api.form.controls.password.touched).toBe(true);
  });

  it('rejects a malformed email before contacting the server', async () => {
    await setUp();
    api.form.setValue({ email: 'not-an-email', password: 'secret' });

    api.submit();

    http.expectNone(LOGIN_URL);
  });

  it('signs in and goes to the dashboard by default', async () => {
    await setUp();
    api.form.setValue({ email: 'jane@example.com', password: 'secret' });

    api.submit();
    http.expectOne(LOGIN_URL).flush(SESSION);

    expect(navigated).toEqual(['/dashboard']);
  });

  it('returns the user to the page that sent them to sign in', async () => {
    await setUp('/urls?page=2');
    api.form.setValue({ email: 'jane@example.com', password: 'secret' });

    api.submit();
    http.expectOne(LOGIN_URL).flush(SESSION);

    expect(navigated).toEqual(['/urls?page=2']);
  });

  it('shows a rejection without revealing which field was wrong', async () => {
    await setUp();
    api.form.setValue({ email: 'jane@example.com', password: 'wrong' });

    api.submit();
    http.expectOne(LOGIN_URL).flush({ detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });

    expect(api.serverError()).toBe('Invalid email or password.');
    expect(api.submitting()).toBe(false);
    expect(navigated).toHaveLength(0);
  });

  it('explains an unreachable backend rather than showing a raw error', async () => {
    await setUp();
    api.form.setValue({ email: 'jane@example.com', password: 'secret' });

    api.submit();
    http.expectOne(LOGIN_URL).error(new ProgressEvent('network error'), { status: 0 });

    expect(api.serverError()).toContain('Cannot reach the server');
  });

  it('ignores a second submit while the first is still in flight', async () => {
    await setUp();
    api.form.setValue({ email: 'jane@example.com', password: 'secret' });

    api.submit();
    api.submit();

    http.expectOne(LOGIN_URL).flush(SESSION);
  });
});
