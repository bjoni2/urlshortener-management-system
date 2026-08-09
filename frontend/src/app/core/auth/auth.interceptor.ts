import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenRefresher } from './token-refresh';

function isTokenEndpoint(url: string): boolean {
  return url.includes('/api/v1/auth/');
}

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const refresher = inject(TokenRefresher);
  const router = inject(Router);

  if (isTokenEndpoint(request.url)) {
    return next(request);
  }

  const token = auth.currentAccessToken();
  const outgoing = token ? withBearer(request, token) : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const isExpiredToken =
        error instanceof HttpErrorResponse && error.status === 401 && !!auth.currentRefreshToken();
      if (!isExpiredToken) {
        return throwError(() => error);
      }

      return refresher.refresh().pipe(
        switchMap((fresh) => next(withBearer(request, fresh))),
        catchError((refreshError: unknown) => {
          auth.clearSession();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
