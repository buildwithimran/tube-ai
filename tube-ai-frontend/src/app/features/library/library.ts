import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ContentType, GeneratedContent } from '../../core/models';

interface FavoriteItem {
  _id: string;
  video?: {
    _id: string;
    title?: string;
    channel?: string;
    thumbnailUrl?: string;
  };
}

const LABELS: Record<string, string> = {
  summary_short: 'Summary',
  summary_long: 'Summary',
  chapter_notes: 'Notes',
  key_takeaways: 'Takeaways',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
};

@Component({
  selector: 'app-library',
  imports: [RouterLink, LucideAngularModule, EmptyState, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  goCreate(): void {
    this.router.navigateByUrl('/app');
  }

  readonly items = signal<GeneratedContent[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');

  readonly tab = signal<'saved' | 'favorites' | 'history'>('saved');
  readonly favorites = signal<FavoriteItem[]>([]);
  readonly history = signal<GeneratedContent[]>([]);
  private favLoaded = false;
  private historyLoaded = false;

  tabClass(t: 'saved' | 'favorites' | 'history'): string {
    const base = 'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ';
    return this.tab() === t
      ? base + 'bg-gradient-to-r from-brand-600 to-accent-500 text-white shadow-sm'
      : base + 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200';
  }

  switchTab(t: 'saved' | 'favorites' | 'history'): void {
    this.tab.set(t);
    if (t === 'favorites' && !this.favLoaded) {
      this.favLoaded = true;
      this.api.get<FavoriteItem[]>('/favorites').subscribe({
        next: (f) => this.favorites.set(f),
        error: () => {},
      });
    }
    if (t === 'history' && !this.historyLoaded) {
      this.historyLoaded = true;
      this.api.get<GeneratedContent[]>('/library/history').subscribe({
        next: (items) => this.history.set(this.dedupeByVideo(items)),
        error: () => {},
      });
    }
  }

  private dedupeByVideo(items: GeneratedContent[]): GeneratedContent[] {
    const seen = new Set<string>();
    const out: GeneratedContent[] = [];
    for (const it of items) {
      const vid = it.video?._id;
      if (vid && !seen.has(vid)) {
        seen.add(vid);
        out.push(it);
      }
    }
    return out;
  }

  unfavorite(videoId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.api.delete(`/favorites/${videoId}`).subscribe(() => {
      this.favorites.update((l) => l.filter((x) => x.video?._id !== videoId));
      this.toast.success('Removed from favorites');
    });
  }

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.items();
    if (!q) return list;
    return list.filter((i) =>
      (i.video?.title ?? '').toLowerCase().includes(q) ||
      (i.video?.channel ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.api.get<GeneratedContent[]>('/library').subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'favorites' || tab === 'history') this.switchTab(tab);
  }

  label(type: ContentType): string {
    return LABELS[type] ?? type;
  }

  remove(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.api.delete(`/library/${id}`).subscribe(() => {
      this.items.update((list) => list.filter((x) => x._id !== id));
      this.toast.success('Removed from library');
    });
  }
}
