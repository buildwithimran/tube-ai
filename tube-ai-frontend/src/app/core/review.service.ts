import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ReviewCard {
  _id: string;
  front: string;
  back: string;
  intervalDays: number;
  reps: number;
}

export interface ReviewStats {
  total: number;
  due: number;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);

  stats(): Observable<ReviewStats> {
    return this.api.get('/review/stats');
  }
  due(): Observable<ReviewCard[]> {
    return this.api.get('/review/due');
  }
  grade(cardId: string, rating: Rating): Observable<unknown> {
    return this.api.post(`/review/${cardId}/grade`, { rating });
  }
  addDeck(videoId: string): Observable<{ added: number }> {
    return this.api.post('/review/decks', { videoId });
  }
}
