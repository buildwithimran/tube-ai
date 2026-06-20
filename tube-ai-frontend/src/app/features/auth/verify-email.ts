import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { OtpInput } from '../../shared/ui/otp-input/otp-input';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';

@Component({
  selector: 'app-verify-email',
  imports: [OtpInput, RouterLink, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly error = signal('');
  readonly resendIn = signal(0);

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    if (this.auth.user()?.emailVerified) {
      this.router.navigateByUrl('/app');
    }
    this.startResendTimer();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  submit(code: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyOtp(code).subscribe({
      next: () => {
        this.toast.success('Email verified 🎉');
        this.router.navigateByUrl('/app');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e?.error?.message ?? 'Invalid or expired code.');
        this.loading.set(false);
      },
    });
  }

  resend(): void {
    if (this.resendIn() > 0 || this.resending()) return;
    this.resending.set(true);
    this.auth.resendOtp().subscribe({
      next: () => {
        this.resending.set(false);
        this.toast.success('A new code is on its way — check spam too');
        this.startResendTimer();
      },
      error: (e: HttpErrorResponse) => {
        this.resending.set(false);
        this.toast.error(e?.error?.message ?? 'Could not resend — try again shortly');
      },
    });
  }

  private startResendTimer(): void {
    this.resendIn.set(30);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.resendIn.update((s) => (s > 0 ? s - 1 : 0));
      if (this.resendIn() === 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  }
}
