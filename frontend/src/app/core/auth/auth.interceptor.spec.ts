import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthResponse, UserResponse } from '../models/api.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

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

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';
const REFRESH_URL = 'http://localhost:8080/api/v1/auth/refresh';
const API_URL = 'http://localhost:8080/api/v1/urls';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  let navigations: unknown[][];

  beforeEach(() => {
    localStorage.clear();
    navigations = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            url: '/urls',
            navigate: (commands: unknown[]) => {
              navigations.push(commands);
              return Promise.resolve(true);
            },
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function signIn(): void {
    auth.login('jane@example.com', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(SESSION);
  }

  it('sends no Authorization header while anonymous', () => {
    client.get(API_URL).subscribe();

    expect(http.expectOne(API_URL).request.headers.has('Authorization')).toBe(false);
  });

  it('attaches the access token once signed in', () => {
    signIn();
    client.get(API_URL).subscribe();

    expect(http.expectOne(API_URL).request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('never attaches a token to the endpoints that mint one', () => {
    signIn();
    auth.refreshSession().subscribe();

    const refresh = http.expectOne(REFRESH_URL);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush(SESSION);
  });

  it('recovers from an expired access token by refreshing and replaying the request', () => {
    signIn();
    let received: unknown;
    client.get(API_URL).subscribe((response) => (received = response));

    http.expectOne(API_URL).flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH_URL).flush({ ...SESSION, accessToken: 'access-2', refreshToken: 'refresh-2' });

    const replay = http.expectOne(API_URL);
    expect(replay.request.headers.get('Authorization')).toBe('Bearer access-2');
    replay.flush({ content: [] });

    expect(received).toEqual({ content: [] });
    expect(navigations).toHaveLength(0);
  });

  it('refreshes only once when several requests expire together', () => {
    signIn();
    client.get(API_URL).subscribe();
    client.get(`${API_URL}/stats`).subscribe();

    http.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API_URL}/stats`).flush(null, { status: 401, statusText: 'Unauthorized' });

    // A second rotation would be treated as token replay by the backend and kill every session.
    const refreshes = http.match(REFRESH_URL);
    expect(refreshes).toHaveLength(1);
    refreshes[0].flush({ ...SESSION, accessToken: 'access-2', refreshToken: 'refresh-2' });

    http.expectOne(API_URL).flush({});
    http.expectOne(`${API_URL}/stats`).flush({});
  });

  it('ends the session and sends the user to the login page when the refresh also fails', () => {
    signIn();
    let failed = false;
    client.get(API_URL).subscribe({ error: () => (failed = true) });

    http.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigations).toEqual([['/login']]);
  });

  it('does not attempt a refresh when there is no refresh token to use', () => {
    let failed = false;
    client.get(API_URL).subscribe({ error: () => (failed = true) });

    http.expectOne(API_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    http.expectNone(REFRESH_URL);
  });

  it('passes other failures straight through without touching the session', () => {
    signIn();
    let status = 0;
    client.get(API_URL).subscribe({ error: (error: { status: number }) => (status = error.status) });

    http.expectOne(API_URL).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(auth.isAuthenticated()).toBe(true);
    http.expectNone(REFRESH_URL);
  });
});
