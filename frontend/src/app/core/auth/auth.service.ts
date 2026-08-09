import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, UserResponse } from '../models/api.models';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorage);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/auth`;

  private readonly currentUser = signal<UserResponse | null>(null);
  private readonly accessToken = signal<string | null>(null);
  private readonly refreshToken = signal<string | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  constructor() {
    const stored = this.storage.read();
    if (stored) {
      this.accessToken.set(stored.accessToken);
      this.refreshToken.set(stored.refreshToken);
    }
  }

  currentAccessToken(): string | null {
    return this.accessToken();
  }

  currentRefreshToken(): string | null {
    return this.refreshToken();
  }

  register(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, { email, password })
      .pipe(tap((response) => this.acceptSession(response)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { email, password })
      .pipe(tap((response) => this.acceptSession(response)));
  }

  refreshSession(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken: this.refreshToken() })
      .pipe(tap((response) => this.acceptSession(response)));
  }

  loadCurrentUser(): Observable<UserResponse> {
    return this.http
      .get<UserResponse>(`${environment.apiBaseUrl}/api/v1/users/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): void {
    const token = this.refreshToken();
    this.clearSession();
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, { refreshToken: token }).subscribe({
        error: () => undefined,
      });
    }
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.storage.clear();
  }

  private acceptSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.refreshToken.set(response.refreshToken);
    this.currentUser.set(response.user);
    this.storage.write({ accessToken: response.accessToken, refreshToken: response.refreshToken });
  }
}
