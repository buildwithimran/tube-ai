import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';
import { allowedEmailDomainValidator } from '../../core/email-domains';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [
      '',
      [Validators.required, Validators.email, allowedEmailDomainValidator],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get emailCtrl() {
    return this.form.controls.email;
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { name, email, password } = this.form.getRawValue();
    this.auth.register(name, email, password).subscribe({
      next: () => this.router.navigateByUrl('/verify'),
      error: (e: HttpErrorResponse) => {
        this.error.set(e?.error?.message ?? 'Could not create account.');
        this.loading.set(false);
      },
    });
  }
}
