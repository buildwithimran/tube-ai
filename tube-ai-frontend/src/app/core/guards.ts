import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Require an authenticated session; hydrate from cookie if needed. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return auth
    .ensureLoaded()
    .pipe(map((u) => (u ? true : router.createUrlTree(['/login']))));
};

/** Block authenticated users from auth pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return router.createUrlTree(['/app']);
  return auth
    .ensureLoaded()
    .pipe(map((u) => (u ? router.createUrlTree(['/app']) : true)));
};

/** Admin-only. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureLoaded()
    .pipe(map((u) => (u?.role === 'admin' ? true : router.createUrlTree(['/app']))));
};
