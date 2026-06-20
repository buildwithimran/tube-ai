import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css',
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);

  icon(type: string): string {
    return type === 'success' ? 'check' : type === 'error' ? 'alert-circle' : 'sparkles';
  }

  toastClass(type: string): string {
    const base =
      'animate-fade-rise pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur ';
    if (type === 'success')
      return base + 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    if (type === 'error')
      return base + 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    return base + 'border-white/10 bg-neutral-900/80 text-neutral-100';
  }
}
