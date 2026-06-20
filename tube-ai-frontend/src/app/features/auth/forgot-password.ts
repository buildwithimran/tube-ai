import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';

type Step = 'request' | 'reset';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.html',
  styleUrl: './login.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly step = signal<Step>('request');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  requestCode(): void {
    if (this.requestForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const email = this.requestForm.getRawValue().email.trim();
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('reset');
        this.toast.success('If that email is registered, a 6-digit code is on its way.');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e?.error?.message ?? 'Something went wrong. Try again.');
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    if (this.resetForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const email = this.requestForm.getRawValue().email.trim();
    const { code, password } = this.resetForm.getRawValue();
    this.auth.resetPassword(email, code, password).subscribe({
      next: () => {
        this.toast.success('Password updated — please log in.');
        this.router.navigateByUrl('/login');
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(e?.error?.message ?? 'Could not reset password. Check your code.');
        this.loading.set(false);
      },
    });
  }

  resend(): void {
    this.step.set('request');
    this.error.set('');
  }
}
