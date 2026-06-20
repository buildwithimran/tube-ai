import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { CoursesService, Course } from '../../core/courses.service';
import { ToastService } from '../../core/toast.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-courses',
  imports: [RouterLink, LucideAngularModule, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  private readonly svc = inject(CoursesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly url = signal('');
  readonly creating = signal(false);

  ngOnInit(): void {
    this.svc.list().subscribe({
      next: (c) => {
        this.courses.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  progress(c: Course): number {
    if (!c.lessons.length) return 0;
    const done = c.lessons.filter((l) => l.completed).length;
    return Math.round((done / c.lessons.length) * 100);
  }

  create(): void {
    if (!this.url() || this.creating()) return;
    this.creating.set(true);
    this.svc.create(this.url()).subscribe({
      next: (course) => this.router.navigate(['/app/courses', course._id]),
      error: (e: HttpErrorResponse) => {
        this.creating.set(false);
        this.toast.error(e?.error?.message ?? 'Could not build the course');
      },
    });
  }
}
