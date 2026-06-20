import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';
import { ApiService } from './api.service';
import { API_BASE } from './config';
import { ExtractResult, JobStatus, VideoMeta } from './models';

export interface SearchVideo {
  youtubeId: string;
  title: string;
  channel?: string;
  durationText?: string;
  thumbnail?: string;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly api = inject(ApiService);

  validate(url: string): Observable<{ videoId: string; meta: VideoMeta }> {
    return this.api.post('/videos/validate', { url });
  }

  search(query: string): Observable<SearchVideo[]> {
    return this.api.get('/videos/search', { q: query });
  }

  extract(url: string, lang = 'en'): Observable<{ jobId: string }> {
    return this.api.post('/videos/extract', { url, lang });
  }

  job(id: string): Observable<JobStatus<ExtractResult>> {
    return this.api.get(`/jobs/${id}`);
  }

  /** Poll a job until it completes or fails (emits each tick incl. the last). */
  poll(id: string): Observable<JobStatus<ExtractResult>> {
    return timer(0, 1300).pipe(
      switchMap(() => this.job(id)),
      takeWhile(
        (j) => j.status !== 'completed' && j.status !== 'failed',
        true,
      ),
    );
  }

  getVideo(id: string): Observable<VideoMeta & { _id: string }> {
    return this.api.get(`/videos/${id}`);
  }

  getTranscript(id: string, lang = 'en'): Observable<unknown> {
    return this.api.get(`/videos/${id}/transcript`, { lang });
  }

  srtUrl(id: string, lang = 'en'): string {
    return `${API_BASE}/videos/${id}/srt?lang=${lang}`;
  }
}
