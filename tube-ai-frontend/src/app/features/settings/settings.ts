import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { ReviewService } from '../../core/review.service';

interface SessionInfo {
  _id: string;
  userAgent?: string;
  ip?: string;
}

@Component({
  selector: 'app-settings',
  imports: [LucideAngularModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly review = inject(ReviewService);

  readonly sessions = signal<SessionInfo[]>([]);
  readonly feedbackMsg = signal('');
  readonly feedbackSent = signal(false);
  readonly reviewDue = signal(0);
  readonly reviewTotal = signal(0);

  planBadgeClass(): string {
    const base =
      'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ';
    return this.auth.user()?.planKey === 'pro'
      ? base + 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
      : base + 'bg-black/5 text-neutral-500 dark:bg-white/5 dark:text-neutral-400';
  }

  ngOnInit(): void {
    this.loadSessions();
    this.review.stats().subscribe({
      next: (s) => {
        this.reviewDue.set(s.due);
        this.reviewTotal.set(s.total);
      },
      error: () => {},
    });
  }

  private loadSessions(): void {
    this.api.get<SessionInfo[]>('/auth/sessions').subscribe({
      next: (s) => this.sessions.set(s),
      error: () => {},
    });
  }

  revoke(id: string): void {
    this.api.delete(`/auth/sessions/${id}`).subscribe(() => this.loadSessions());
  }

  logoutAll(): void {
    this.api.post('/auth/logout-all', {}).subscribe(() => {
      this.auth.clear();
      this.router.navigateByUrl('/login');
    });
  }

  sendFeedback(): void {
    if (!this.feedbackMsg()) return;
    this.api.post('/feedback', { message: this.feedbackMsg() }).subscribe(() => {
      this.feedbackSent.set(true);
      this.feedbackMsg.set('');
    });
  }
}
