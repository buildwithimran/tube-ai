import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CourseLesson {
  youtubeId: string;
  title?: string;
  durationText?: string;
  order: number;
  completed: boolean;
}

export interface Course {
  _id: string;
  title: string;
  playlistId: string;
  lessons: CourseLesson[];
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private readonly api = inject(ApiService);

  create(playlistUrl: string): Observable<Course> {
    return this.api.post('/courses', { playlistUrl });
  }
  list(): Observable<Course[]> {
    return this.api.get('/courses');
  }
  get(id: string): Observable<Course> {
    return this.api.get(`/courses/${id}`);
  }
  setComplete(id: string, order: number, completed: boolean): Observable<unknown> {
    return this.api.patch(`/courses/${id}/lessons/${order}`, { completed });
  }
}
