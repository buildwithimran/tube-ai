import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'verify',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'video/:id',
        loadComponent: () =>
          import('./features/learning-pack/learning-pack').then(
            (m) => m.LearningPack,
          ),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./features/library/library').then((m) => m.Library),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./features/courses/courses').then((m) => m.Courses),
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import('./features/courses/course-detail').then((m) => m.CourseDetail),
      },
      {
        path: 'review',
        loadComponent: () =>
          import('./features/review/review').then((m) => m.Review),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin').then((m) => m.Admin),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
