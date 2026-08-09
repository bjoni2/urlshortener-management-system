import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RegisterComponent, passwordStrength, passwordsMatch } from './register.component';

describe('password validators', () => {
  it('accepts a password with both a letter and a digit', () => {
    expect(passwordStrength(new FormControl('Str0ngPass'))).toBeNull();
  });

  it('rejects letters only or digits only', () => {
    expect(passwordStrength(new FormControl('onlyletters'))).toEqual({ passwordStrength: true });
    expect(passwordStrength(new FormControl('12345678'))).toEqual({ passwordStrength: true });
  });

  it('stays quiet on an empty field, where "required" is the relevant message', () => {
    expect(passwordStrength(new FormControl(''))).toBeNull();
  });

  it('flags a mismatched confirmation on the group, not on either field alone', () => {
    const group = new FormGroup({
      password: new FormControl('Str0ngPass'),
      confirmPassword: new FormControl('Different1'),
    });

    expect(passwordsMatch(group)).toEqual({ passwordMismatch: true });
  });

  it('accepts a matching confirmation, and says nothing before one is typed', () => {
    const matching = new FormGroup({
      password: new FormControl('Str0ngPass'),
      confirmPassword: new FormControl('Str0ngPass'),
    });
    const untouched = new FormGroup({
      password: new FormControl('Str0ngPass'),
      confirmPassword: new FormControl(''),
    });

    expect(passwordsMatch(matching)).toBeNull();
    expect(passwordsMatch(untouched)).toBeNull();
  });
});

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        // A real route for the post-registration redirect, so the navigation resolves.
        provideRouter([{ path: 'dashboard', children: [] }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  /**
   * The component's members are `protected` so nothing but its own template depends on them. Tests
   * reach them through this one narrow view instead of loosening the component's own visibility.
   */
  interface TemplateApi {
    form: FormGroup<{
      email: FormControl<string>;
      password: FormControl<string>;
      confirmPassword: FormControl<string>;
    }>;
    submit(): void;
    serverError(): string | null;
  }

  function api(): TemplateApi {
    return component as unknown as TemplateApi;
  }

  it('starts invalid so the submit cannot fire on an empty form', () => {
    expect(api().form.invalid).toBe(true);

    api().submit();

    http.expectNone('http://localhost:8080/api/v1/auth/register');
    expect(api().form.controls.email.touched).toBe(true);
  });

  it('rejects a mismatched confirmation before contacting the server', () => {
    api().form.setValue({
      email: 'jane@example.com',
      password: 'Str0ngPass',
      confirmPassword: 'Different1',
    });

    expect(api().form.hasError('passwordMismatch')).toBe(true);

    api().submit();
    http.expectNone('http://localhost:8080/api/v1/auth/register');
  });

  it('submits a valid form', () => {
    api().form.setValue({
      email: 'jane@example.com',
      password: 'Str0ngPass',
      confirmPassword: 'Str0ngPass',
    });

    api().submit();

    const request = http.expectOne('http://localhost:8080/api/v1/auth/register');
    expect(request.request.body).toEqual({ email: 'jane@example.com', password: 'Str0ngPass' });
    request.flush({
      accessToken: 'a',
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: '1', email: 'jane@example.com', role: 'USER', enabled: true, createdAt: '2026-01-01T00:00:00Z' },
    });
  });

  it('shows the reason the server gave when the email is already taken', () => {
    api().form.setValue({
      email: 'jane@example.com',
      password: 'Str0ngPass',
      confirmPassword: 'Str0ngPass',
    });

    api().submit();
    http
      .expectOne('http://localhost:8080/api/v1/auth/register')
      .flush({ detail: 'An account with this email already exists.' }, { status: 409, statusText: 'Conflict' });

    expect(api().serverError()).toBe('An account with this email already exists.');
  });
});
