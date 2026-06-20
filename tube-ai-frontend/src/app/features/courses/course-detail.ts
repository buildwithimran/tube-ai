import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { CoursesService, Course, CourseLesson } from '../../core/courses.service';
import { VideoService } from '../../core/video.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-course-detail',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail implements OnInit {
  readonly id = input.required<string>();

  private readonly svc = inject(CoursesService);
  private readonly video = inject(VideoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly course = signal<Course | null>(null);
  readonly starting = signal<number | null>(null);

  readonly progress = computed(() => {
    const c = this.course();
    if (!c?.lessons.length) return 0;
    const done = c.lessons.filter((l) => l.completed).length;
    return Math.round((done / c.lessons.length) * 100);
  });

  ngOnInit(): void {
    this.svc.get(this.id()).subscribe({
      next: (c) => this.course.set(c),
      error: () => this.toast.error('Course not found'),
    });
  }

  startLesson(lesson: CourseLesson): void {
    if (this.starting() !== null) return;
    this.starting.set(lesson.order);
    this.video
      .extract(`https://www.youtube.com/watch?v=${lesson.youtubeId}`)
      .subscribe({
        next: ({ jobId }) => {
          this.video.poll(jobId).subscribe({
            next: (job) => {
              if (job.status === 'completed' && job.result) {
                this.starting.set(null);
                this.router.navigate(['/app/video', job.result.videoId]);
              } else if (job.status === 'failed') {
                this.starting.set(null);
                this.toast.error('Could not load this lesson — no captions?');
              }
            },
            error: () => this.failStart(),
          });
        },
        error: (e: HttpErrorResponse) => this.failStart(e),
      });
  }

  toggle(lesson: CourseLesson): void {
    const completed = !lesson.completed;
    this.course.update((c) =>
      c
        ? {
            ...c,
            lessons: c.lessons.map((l) =>
              l.order === lesson.order ? { ...l, completed } : l,
            ),
          }
        : c,
    );
    this.svc.setComplete(this.id(), lesson.order, completed).subscribe({
      error: () => {
        // revert on failure
        this.course.update((c) =>
          c
            ? {
                ...c,
                lessons: c.lessons.map((l) =>
                  l.order === lesson.order ? { ...l, completed: !completed } : l,
                ),
              }
            : c,
        );
        this.toast.error('Could not update progress');
      },
    });
  }

  private failStart(e?: HttpErrorResponse): void {
    this.starting.set(null);
    this.toast.error(e?.error?.message ?? 'Could not start the lesson');
  }
}
