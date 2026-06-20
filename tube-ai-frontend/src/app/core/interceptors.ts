import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE } from './config';
import { AuthService } from './auth.service';

/** Ensure cookies travel with every API request. */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(API_BASE)) {
    req = req.clone({ withCredentials: true });
  }
  return next(req);
};

/**
 * On a 401, transparently rotate the access token via /auth/refresh and retry
 * once. Skips auth endpoints to avoid loops (§47 silent refresh).
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthCall =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout');

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall) {
        return auth.refresh().pipe(
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError((e) => {
            auth.clear();
            return throwError(() => e);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
