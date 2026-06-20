import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  LucideAngularModule,
  Sparkles, Play, FileText, Brain, Clock, Download, Save, Copy, RefreshCw,
  Check, X, ChevronRight, ChevronLeft, Home, Library, Settings, LogOut,
  Moon, Sun, Search, Trash2, Shield, ArrowRight, AlertCircle, Plus, Mail,
  Bell, Star, Zap, Youtube, ListChecks, NotebookPen, CircleHelp, Loader,
  GraduationCap, Layers,
} from 'lucide-angular';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';

import { routes } from './app.routes';
import {
  authRefreshInterceptor,
  credentialsInterceptor,
} from './core/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    importProvidersFrom(
      LucideAngularModule.pick({
        Sparkles, Play, FileText, Brain, Clock, Download, Save, Copy, RefreshCw,
        Check, X, ChevronRight, ChevronLeft, Home, Library, Settings, LogOut,
        Moon, Sun, Search, Trash2, Shield, ArrowRight, AlertCircle, Plus, Mail,
        Bell, Star, Zap, Youtube, ListChecks, NotebookPen, CircleHelp, Loader,
        GraduationCap, Layers,
      }),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, authRefreshInterceptor]),
      // §47.4 CSRF: Angular sends X-XSRF-TOKEN from the XSRF-TOKEN cookie.
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
  ],
};
