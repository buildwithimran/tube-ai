import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ReviewService, ReviewCard, Rating } from '../../core/review.service';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';

@Component({
  selector: 'app-review',
  imports: [RouterLink, LucideAngularModule, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review implements OnInit {
  private readonly svc = inject(ReviewService);

  readonly queue = signal<ReviewCard[]>([]);
  readonly index = signal(0);
  readonly flipped = signal(false);
  readonly loading = signal(true);
  readonly grading = signal(false);
  readonly reviewed = signal(0);

  readonly current = computed<ReviewCard | null>(
    () => this.queue()[this.index()] ?? null,
  );
  readonly done = computed(
    () => !this.loading() && this.index() >= this.queue().length,
  );

  ngOnInit(): void {
    this.svc.due().subscribe({
      next: (cards) => {
        this.queue.set(cards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  flip(): void {
    this.flipped.set(true);
  }

  grade(rating: Rating): void {
    const card = this.current();
    if (!card || this.grading()) return;
    this.grading.set(true);
    this.svc.grade(card._id, rating).subscribe({
      next: () => this.advance(),
      error: () => this.advance(),
    });
  }

  private advance(): void {
    this.reviewed.update((n) => n + 1);
    this.flipped.set(false);
    this.index.update((i) => i + 1);
    this.grading.set(false);
  }
}
