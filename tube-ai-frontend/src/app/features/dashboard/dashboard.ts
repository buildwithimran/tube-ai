import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { VideoService, SearchVideo } from '../../core/video.service';
import { ReviewService } from '../../core/review.service';
import { ToastService } from '../../core/toast.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { GeneratedContent, UsageSummary } from '../../core/models';

type Stage = 'idle' | 'working' | 'error';

interface Step {
  label: string;
  status: string;
}

const SAMPLE = 'https://www.youtube.com/watch?v=arj7oStGLkU';

@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, RouterLink, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly video = inject(VideoService);
  private readonly review = inject(ReviewService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly url = signal('');
  readonly stage = signal<Stage>('idle');
  readonly error = signal('');
  readonly activeStep = signal(0);
  readonly elapsed = signal(0);
  readonly usage = signal<UsageSummary | null>(null);
  readonly recent = signal<GeneratedContent[]>([]);
  readonly recentLoaded = signal(false);

  readonly searchQuery = signal('');
  readonly searchResults = signal<SearchVideo[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly reviewDue = signal(0);

  private ticker?: ReturnType<typeof setInterval>;

  readonly steps: Step[] = [
    { label: 'Validating link', status: 'Checking the URL…' },
    { label: 'Fetching details', status: 'Reading title, channel & length…' },
    { label: 'Extracting transcript', status: 'Reading every word of the video…' },
    { label: 'Analyzing', status: 'Understanding the content…' },
    { label: 'Ready', status: 'Building your Learning Pack…' },
  ];

  constructor() {
    this.loadUsage();
    this.loadRecent();
    this.review.stats().subscribe({
      next: (s) => this.reviewDue.set(s.due),
      error: () => {},
    });
  }

  private loadRecent(): void {
    this.api.get<GeneratedContent[]>('/library/recent').subscribe({
      next: (items) => {
        const seen = new Set<string>();
        const out: GeneratedContent[] = [];
        for (const it of items) {
          const vid = it.video?._id;
          if (vid && !seen.has(vid)) {
            seen.add(vid);
            out.push(it);
          }
        }
        this.recent.set(out.slice(0, 6));
        this.recentLoaded.set(true);
      },
      error: () => this.recentLoaded.set(true),
    });
  }

  ngOnDestroy(): void {
    this.stopTicker();
  }

  pct(used: number, limit: number): number {
    return Math.min(100, Math.round((used / limit) * 100));
  }

  useSample(): void {
    this.url.set(SAMPLE);
    this.process();
  }

  runSearch(): void {
    const q = this.searchQuery().trim();
    if (!q || this.searching()) return;
    this.searching.set(true);
    this.video.search(q).subscribe({
      next: (r) => {
        this.searchResults.set(r);
        this.searching.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.searching.set(false);
        this.searched.set(true);
        this.toast.error('Search failed — try again');
      },
    });
  }

  pick(v: SearchVideo): void {
    this.url.set(`https://www.youtube.com/watch?v=${v.youtubeId}`);
    this.searchResults.set([]);
    this.searched.set(false);
    this.process();
  }

  stepIcon(i: number): string {
    const a = this.activeStep();
    if (i < a) return 'check';
    if (i === a) return 'loader';
    return '';
  }

  circleClass(i: number): string {
    const base = 'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition ';
    const a = this.activeStep();
    if (i < a) return base + 'bg-gradient-to-br from-brand-600 to-accent-500 text-white';
    if (i === a) return base + 'bg-brand-500/15 text-brand-700 ring-2 ring-brand-500/40 dark:text-brand-300';
    return base + 'bg-black/5 text-neutral-400 dark:bg-white/5';
  }

  private loadUsage(): void {
    this.api.get<UsageSummary>('/usage').subscribe({
      next: (u) => this.usage.set(u),
      error: () => {},
    });
  }

  process(): void {
    if (!this.url() || this.stage() === 'working') return;
    this.stage.set('working');
    this.error.set('');
    this.activeStep.set(0);
    this.elapsed.set(0);
    this.startTicker();

    this.video.extract(this.url()).subscribe({
      next: ({ jobId }) => this.poll(jobId),
      error: (e: HttpErrorResponse) => this.fail(e),
    });
  }

  private poll(jobId: string): void {
    this.video.poll(jobId).subscribe({
      next: (job) => {
        if (job.status === 'queued') this.activeStep.set(1);
        else if (job.status === 'processing') this.activeStep.set(3);
        else if (job.status === 'completed' && job.result) {
          this.activeStep.set(4);
          this.stopTicker();
          this.router.navigate(['/app/video', job.result.videoId]);
        } else if (job.status === 'failed') {
          this.failMessage(
            'This video doesn’t have captions/subtitles available, so we can’t build a pack from it. Try another video.',
          );
        }
      },
      error: (e: HttpErrorResponse) => this.fail(e),
    });
  }

  retry(): void {
    this.stage.set('idle');
    this.error.set('');
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => this.elapsed.update((s) => s + 1), 1000);
  }
  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = undefined;
  }

  private fail(e: HttpErrorResponse): void {
    this.failMessage(e?.error?.message ?? 'Something went wrong. Please try again.');
  }
  private failMessage(msg: string): void {
    this.stopTicker();
    this.stage.set('error');
    this.error.set(msg);
    // Inline error box is enough — no noisy bottom toast.
  }
}
