import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthResponse, UserResponse } from '../models/api.models';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

const USER: UserResponse = {
  id: '3f7c1a4e-0000-4000-8000-000000000001',
  email: 'jane@example.com',
  role: 'USER',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const SESSION: AuthResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: USER,
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let storage: TokenStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts anonymous when nothing is stored', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.isAdmin()).toBe(false);
  });

  it('signs in and keeps the session for the next page load', () => {
    service.login('jane@example.com', 'secret').subscribe();

    const request = http.expectOne('http://localhost:8080/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'jane@example.com', password: 'secret' });
    request.flush(SESSION);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentAccessToken()).toBe('access-1');
    expect(service.user()).toEqual(USER);
    expect(storage.read()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('registers and signs the new account in straight away', () => {
    service.register('jane@example.com', 'Str0ngPass').subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/register').flush(SESSION);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('recognises an administrator', () => {
    service.login('admin@example.com', 'secret').subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush({ ...SESSION, user: { ...USER, role: 'ADMIN' } });

    expect(service.isAdmin()).toBe(true);
  });

  it('replaces both tokens when the session is refreshed', () => {
    service.login('jane@example.com', 'secret').subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush(SESSION);

    service.refreshSession().subscribe();
    const refresh = http.expectOne('http://localhost:8080/api/v1/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush({ ...SESSION, accessToken: 'access-2', refreshToken: 'refresh-2' });

    expect(service.currentAccessToken()).toBe('access-2');
    expect(service.currentRefreshToken()).toBe('refresh-2');
    expect(storage.read()?.refreshToken).toBe('refresh-2');
  });

  it('restores a stored session on construction, before the profile is confirmed', () => {
    storage.write({ accessToken: 'stored-access', refreshToken: 'stored-refresh' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    const restored = TestBed.inject(AuthService);

    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.user()).toBeNull();

    restored.loadCurrentUser().subscribe();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:8080/api/v1/users/me').flush(USER);
    expect(restored.user()).toEqual(USER);
    TestBed.inject(HttpTestingController).verify();
  });

  it('clears local state immediately on sign-out, without waiting for the server', () => {
    service.login('jane@example.com', 'secret').subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush(SESSION);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
    expect(storage.read()).toBeNull();

    // The revocation is fire-and-forget; failing it must not resurrect the session.
    http.expectOne('http://localhost:8080/api/v1/auth/logout').error(new ProgressEvent('network error'));
    expect(service.isAuthenticated()).toBe(false);
  });

  it('does not call the server on sign-out when there is no session to revoke', () => {
    service.logout();

    http.expectNone('http://localhost:8080/api/v1/auth/logout');
  });
});
