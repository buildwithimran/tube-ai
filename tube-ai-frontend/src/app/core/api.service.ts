import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from './config';
import { Envelope } from './models';

type Params = Record<string, string | number | boolean | undefined>;

/** Thin HttpClient wrapper: prepends the API base, unwraps {success,data}. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  private url(path: string): string {
    return `${API_BASE}${path}`;
  }

  private toParams(params?: Params): HttpParams {
    let hp = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) hp = hp.set(k, String(v));
      }
    }
    return hp;
  }

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http
      .get<Envelope<T>>(this.url(path), {
        params: this.toParams(params),
        withCredentials: true,
      })
      .pipe(map((r) => r.data));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .post<Envelope<T>>(this.url(path), body ?? {}, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .patch<Envelope<T>>(this.url(path), body ?? {}, { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<Envelope<T>>(this.url(path), { withCredentials: true })
      .pipe(map((r) => r.data));
  }

  /** Raw GET for binary downloads (SRT). */
  getBlob(path: string, params?: Params): Observable<Blob> {
    return this.http.get(this.url(path), {
      params: this.toParams(params),
      withCredentials: true,
      responseType: 'blob',
    });
  }
}
