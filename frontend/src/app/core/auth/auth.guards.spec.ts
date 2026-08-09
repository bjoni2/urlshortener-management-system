import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

const ROUTE = {} as ActivatedRouteSnapshot;
const STATE = { url: '/admin/users' } as RouterStateSnapshot;

describe('route guards', () => {
  let auth: { isAuthenticated: () => boolean; isAdmin: () => boolean };

  function run(guard: typeof authGuard) {
    return TestBed.runInInjectionContext(() => guard(ROUTE, STATE));
  }

  beforeEach(() => {
    auth = { isAuthenticated: () => false, isAdmin: () => false };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
  });

  describe('authGuard', () => {
    it('admits a signed-in user', () => {
      auth.isAuthenticated = () => true;

      expect(run(authGuard)).toBe(true);
    });

    it('sends an anonymous visitor to the login page, remembering where they were going', () => {
      const result = run(authGuard) as UrlTree;

      expect(result).toBeInstanceOf(UrlTree);
      expect(result.toString()).toBe('/login?returnUrl=%2Fadmin%2Fusers');
    });
  });

  describe('adminGuard', () => {
    it('admits an administrator', () => {
      auth.isAuthenticated = () => true;
      auth.isAdmin = () => true;

      expect(run(adminGuard)).toBe(true);
    });

    it('redirects a standard user away rather than showing an empty admin screen', () => {
      auth.isAuthenticated = () => true;

      expect((run(adminGuard) as UrlTree).toString()).toBe('/dashboard');
    });

    it('sends an anonymous visitor to the login page', () => {
      expect((run(adminGuard) as UrlTree).toString()).toContain('/login');
    });
  });

  describe('guestGuard', () => {
    it('admits an anonymous visitor', () => {
      expect(run(guestGuard)).toBe(true);
    });

    it('keeps a signed-in user off the login page', () => {
      auth.isAuthenticated = () => true;

      expect((run(guestGuard) as UrlTree).toString()).toBe('/dashboard');
    });
  });
});
