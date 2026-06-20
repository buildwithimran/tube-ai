import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import confetti from 'canvas-confetti';
import { VideoService } from '../../core/video.service';
import { GenerationService } from '../../core/generation.service';
import { ToastService } from '../../core/toast.service';
import { ApiService } from '../../core/api.service';
import { DownloadService } from '../../core/download.service';
import { TtsService } from '../../core/tts.service';
import { ReviewService } from '../../core/review.service';
import { Markdown } from '../../shared/ui/markdown/markdown';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ErrorState } from '../../shared/ui/error-state/error-state';
import {
  ContentType,
  Flashcard,
  FlashcardsPayload,
  GenerateResult,
  QuizPayload,
  QuizQuestion,
  VideoMeta,
} from '../../core/models';

type Tab = 'notes' | 'flashcards' | 'quiz' | 'transcript';

interface Segment {
  start: number;
  text: string;
}

const TAB_TYPE: Record<Exclude<Tab, 'transcript'>, ContentType> = {
  notes: 'chapter_notes',
  flashcards: 'flashcards',
  quiz: 'quiz',
};

@Component({
  selector: 'app-learning-pack',
  imports: [LucideAngularModule, Markdown, Skeleton, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './learning-pack.html',
  styleUrl: './learning-pack.css',
})
export class LearningPack implements OnInit {
  readonly id = input.required<string>();

  private readonly videos = inject(VideoService);
  private readonly gen = inject(GenerationService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  protected readonly download = inject(DownloadService);
  protected readonly tts = inject(TtsService);
  private readonly review = inject(ReviewService);

  addToReview(): void {
    this.review.addDeck(this.id()).subscribe({
      next: (r) =>
        this.toast.success(
          r.added
            ? `Added ${r.added} card${r.added === 1 ? '' : 's'} to review ⭐`
            : 'These cards are already in your review queue',
        ),
      error: (e: HttpErrorResponse) =>
        this.toast.error(e?.error?.message ?? 'Generate flashcards first'),
    });
  }

  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'notes', label: 'Notes', icon: 'notebook-pen' },
    { id: 'flashcards', label: 'Flashcards', icon: 'brain' },
    { id: 'quiz', label: 'Quiz', icon: 'list-checks' },
    { id: 'transcript', label: 'Transcript', icon: 'file-text' },
  ];

  readonly video$ = signal<VideoMeta | null>(null);
  readonly active = signal<Tab>('notes');
  readonly error = signal('');
  readonly generating = signal<Tab | null>(null);
  private readonly results = signal<Record<string, GenerateResult>>({});
  readonly segments = signal<Segment[]>([]);
  readonly transcriptLoaded = signal(false);
  readonly isFavorite = signal(false);

  // Flashcard deck state
  readonly cardIndex = signal(0);
  readonly cardFlipped = signal(false);

  // Quiz state
  readonly qIndex = signal(0);
  readonly answers = signal<Record<number, number>>({});
  readonly quizDone = signal(false);

  video(): VideoMeta | null {
    return this.video$();
  }

  ngOnInit(): void {
    this.videos.getVideo(this.id()).subscribe({
      next: (v) => this.video$.set(v),
      error: () => {},
    });
    this.api
      .get<{ favorite: boolean }>(`/favorites/check/${this.id()}`)
      .subscribe({ next: (r) => this.isFavorite.set(r.favorite), error: () => {} });
    this.ensure('notes');
  }

  videoTitle(): string {
    return this.video$()?.title ?? 'Learning Pack';
  }

  // --- Favorites -----------------------------------------------------------
  toggleFavorite(): void {
    const next = !this.isFavorite();
    this.isFavorite.set(next); // optimistic
    const req = next
      ? this.api.post('/favorites', { videoId: this.id() })
      : this.api.delete(`/favorites/${this.id()}`);
    req.subscribe({
      next: () => this.toast.success(next ? 'Added to favorites ⭐' : 'Removed from favorites'),
      error: () => {
        this.isFavorite.set(!next);
        this.toast.error('Could not update favorites');
      },
    });
  }

  // --- Listen mode (TTS) ---------------------------------------------------
  listen(): void {
    if (!this.tts.supported) {
      this.toast.error('Listen mode is not supported in this browser');
      return;
    }
    this.tts.toggle(this.notesText());
  }

  // --- Exports -------------------------------------------------------------
  exportMarkdown(): void {
    this.download.text(`${this.videoTitle()}.md`, this.notesText(), 'text/markdown');
    this.toast.success('Markdown downloaded');
  }
  exportPdf(): void {
    this.download.pdf(this.videoTitle(), this.notesText());
    this.toast.success('PDF downloaded');
  }
  exportAnki(): void {
    this.download.ankiCsv(`${this.videoTitle()}-flashcards.csv`, this.cards());
    this.toast.success('Anki CSV downloaded');
  }
  async downloadThumb(): Promise<void> {
    const v = this.video$();
    if (!v?.youtubeId) return;
    try {
      await this.download.thumbnail(v.youtubeId, this.videoTitle());
    } catch {
      this.toast.error('Thumbnail unavailable');
    }
  }

  srtUrl(): string {
    return this.videos.srtUrl(this.id());
  }

  tabClass(id: Tab): string {
    const base = 'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ';
    return this.active() === id
      ? base + 'bg-gradient-to-r from-brand-600 to-accent-500 text-white shadow-sm'
      : base + 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200';
  }

  select(tab: Tab): void {
    this.active.set(tab);
    this.error.set('');
    if (tab === 'transcript') this.loadTranscript();
    else this.ensure(tab);
  }

  private ensure(tab: Exclude<Tab, 'transcript'>, fresh = false): void {
    if (this.results()[tab] || this.generating()) return;
    this.error.set('');
    this.generating.set(tab);
    this.gen.generate(this.id(), TAB_TYPE[tab], 'en', fresh).subscribe({
      next: ({ jobId }) => this.poll(tab, jobId),
      error: (e: HttpErrorResponse) => this.fail(e),
    });
  }

  retry(): void {
    const tab = this.active();
    if (tab === 'transcript') {
      this.transcriptLoaded.set(false);
      this.loadTranscript();
    } else {
      this.ensure(tab);
    }
  }

  private poll(tab: Tab, jobId: string): void {
    this.gen.poll(jobId).subscribe({
      next: (job) => {
        if (job.status === 'completed' && job.result) {
          this.results.update((r) => ({ ...r, [tab]: job.result as GenerateResult }));
          this.generating.set(null);
        } else if (job.status === 'failed') {
          this.generating.set(null);
          this.error.set(job.failedReason ?? 'Generation failed. Try again.');
        }
      },
      error: (e: HttpErrorResponse) => this.fail(e),
    });
  }

  private loadTranscript(): void {
    if (this.transcriptLoaded()) return;
    this.videos.getTranscript(this.id()).subscribe({
      next: (t) => {
        this.segments.set((t as { segments?: Segment[] })?.segments ?? []);
        this.transcriptLoaded.set(true);
      },
      error: () => this.transcriptLoaded.set(true),
    });
  }

  result(tab: Tab): GenerateResult | undefined {
    return this.results()[tab];
  }

  notesText(): string {
    const p = this.results()['notes']?.payload;
    return typeof p === 'string' ? p : '';
  }

  // --- Flashcards ----------------------------------------------------------
  cards(): Flashcard[] {
    return (this.results()['flashcards']?.payload as FlashcardsPayload)?.cards ?? [];
  }
  currentCard = computed<Flashcard | null>(() => this.cards()[this.cardIndex()] ?? null);
  flip(): void {
    this.cardFlipped.update((f) => !f);
  }
  nextCard(): void {
    if (this.cardIndex() < this.cards().length - 1) {
      this.cardIndex.update((i) => i + 1);
      this.cardFlipped.set(false);
    }
  }
  prevCard(): void {
    if (this.cardIndex() > 0) {
      this.cardIndex.update((i) => i - 1);
      this.cardFlipped.set(false);
    }
  }

  // --- Quiz ----------------------------------------------------------------
  questions(): QuizQuestion[] {
    return (this.results()['quiz']?.payload as QuizPayload)?.questions ?? [];
  }
  currentQ = computed<QuizQuestion | null>(() => this.questions()[this.qIndex()] ?? null);
  isAnswered(q: number): boolean {
    return this.answers()[q] !== undefined;
  }
  answer(optionIndex: number): void {
    const q = this.qIndex();
    if (this.isAnswered(q)) return;
    this.answers.update((a) => ({ ...a, [q]: optionIndex }));
  }
  optionClass(optionIndex: number, answerIndex: number): string {
    const base = 'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ';
    const q = this.qIndex();
    if (!this.isAnswered(q)) {
      return base + 'border-black/10 hover:border-brand-400 hover:bg-brand-500/5 dark:border-white/10';
    }
    if (optionIndex === answerIndex) return base + 'border-emerald-500 bg-emerald-500/10';
    if (this.answers()[q] === optionIndex) return base + 'border-rose-500 bg-rose-500/10';
    return base + 'border-black/10 opacity-50 dark:border-white/10';
  }
  nextQuestion(): void {
    if (this.qIndex() < this.questions().length - 1) {
      this.qIndex.update((i) => i + 1);
    } else {
      this.finishQuiz();
    }
  }
  private finishQuiz(): void {
    this.quizDone.set(true);
    if (this.score() === this.questions().length) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  }
  score = computed(() => {
    const qs = this.questions();
    const a = this.answers();
    return qs.reduce((acc, q, i) => acc + (a[i] === q.answerIndex ? 1 : 0), 0);
  });
  restartQuiz(): void {
    this.answers.set({});
    this.qIndex.set(0);
    this.quizDone.set(false);
  }

  // --- Transcript ----------------------------------------------------------
  time(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- Actions -------------------------------------------------------------
  save(): void {
    const r = this.results()[this.active()];
    if (!r) return;
    this.gen.saveToLibrary(r.generatedId).subscribe({
      next: () => this.toast.success('Saved to your library'),
      error: () => this.toast.error('Could not save'),
    });
  }
  regenerate(): void {
    const tab = this.active();
    if (tab === 'transcript') return;
    this.results.update((r) => {
      const next = { ...r };
      delete next[tab];
      return next;
    });
    if (tab === 'flashcards') {
      this.cardIndex.set(0);
      this.cardFlipped.set(false);
    }
    if (tab === 'quiz') this.restartQuiz();
    this.ensure(tab, true); // regenerate = force a fresh AI run
  }

  copyNotes(): void {
    const text = this.notesText();
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.toast.success('Copied to clipboard');
    }
  }

  private fail(e: HttpErrorResponse): void {
    this.generating.set(null);
    this.error.set(e?.error?.message ?? 'Something went wrong.');
  }
}
