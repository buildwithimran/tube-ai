import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './models';

/** Session state (signals) + auth actions. Tokens live in httpOnly cookies. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  private loaded = false;

  login(email: string, password: string): Observable<User> {
    return this.api
      .post<User>('/auth/login', { email, password })
      .pipe(tap((u) => this.setUser(u)));
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.api
      .post<User>('/auth/register', { name, email, password })
      .pipe(tap((u) => this.setUser(u)));
  }

  refresh(): Observable<unknown> {
    return this.api.post('/auth/refresh', {});
  }

  verifyOtp(code: string): Observable<User> {
    return this.api
      .post<User>('/auth/verify-otp', { code })
      .pipe(tap((u) => this.user.set(u)));
  }

  resendOtp(): Observable<unknown> {
    return this.api.post('/auth/resend-otp', {});
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.api.post('/auth/forgot-password', { email });
  }

  resetPassword(
    email: string,
    code: string,
    password: string,
  ): Observable<unknown> {
    return this.api.post('/auth/reset-password', { email, code, password });
  }

  me(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(tap((u) => this.setUser(u)));
  }

  logout(): Observable<unknown> {
    return this.api.post('/auth/logout', {}).pipe(tap(() => this.clear()));
  }

  /** Hydrate session from the cookie on first guarded navigation / app load. */
  ensureLoaded(): Observable<User | null> {
    if (this.loaded) return of(this.user());
    return this.me().pipe(
      map((u) => {
        this.loaded = true;
        return u;
      }),
      catchError(() => {
        this.loaded = true;
        this.clear();
        return of(null);
      }),
    );
  }

  private setUser(u: User): void {
    this.user.set(u);
    this.loaded = true;
  }

  clear(): void {
    this.user.set(null);
  }
}
