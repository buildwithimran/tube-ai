import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';

interface Metrics {
  users: number;
  videos: number;
  generations: number;
  extractsToday: number;
  generationsToday: number;
}

interface AdminUser {
  _id: string;
  email: string;
  planKey: string;
  role: string;
}

interface FeedbackItem {
  _id: string;
  message: string;
  category: string;
  status: 'open' | 'resolved';
  createdAt?: string;
  user?: { email?: string; name?: string };
}

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  private readonly api = inject(ApiService);

  readonly metrics = signal<Metrics | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly feedback = signal<FeedbackItem[]>([]);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.api.get<Metrics>('/admin/metrics').subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {},
    });
    this.api.get<AdminUser[]>('/admin/users').subscribe({
      next: (u) => this.users.set(u),
      error: () => {},
    });
    this.loadFeedback();
  }

  private loadFeedback(): void {
    this.api.get<FeedbackItem[]>('/admin/feedback').subscribe({
      next: (f) => this.feedback.set(f),
      error: () => {},
    });
  }

  openFeedbackCount(): number {
    return this.feedback().filter((f) => f.status === 'open').length;
  }

  setPlan(id: string, planKey: string): void {
    this.api.patch(`/admin/users/${id}/plan`, { planKey }).subscribe(() => this.load());
  }

  setFeedbackStatus(id: string, status: 'open' | 'resolved'): void {
    this.api.patch(`/admin/feedback/${id}`, { status }).subscribe({
      next: () =>
        this.feedback.update((list) =>
          list.map((f) => (f._id === id ? { ...f, status } : f)),
        ),
      error: () => {},
    });
  }
}
