import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import { ApiService } from './api.service';
import { ContentType, GenerateResult, JobStatus } from './models';

@Injectable({ providedIn: 'root' })
export class GenerationService {
  private readonly api = inject(ApiService);

  generate(
    videoId: string,
    type: ContentType,
    lang = 'en',
    fresh = false,
  ): Observable<{ jobId: string }> {
    return this.api.post('/generate', { videoId, type, lang, fresh });
  }

  job(id: string): Observable<JobStatus<GenerateResult>> {
    return this.api.get(`/generate/${id}`);
  }

  poll(id: string): Observable<JobStatus<GenerateResult>> {
    return timer(0, 1500).pipe(
      switchMap(() => this.job(id)),
      takeWhile(
        (j) => j.status !== 'completed' && j.status !== 'failed',
        true,
      ),
    );
  }

  saveToLibrary(generatedId: string): Observable<unknown> {
    return this.api.post('/library', { generatedId });
  }
}
