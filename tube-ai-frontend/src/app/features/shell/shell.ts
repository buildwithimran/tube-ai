import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
} from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly year = new Date().getFullYear();

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'home', link: '/app' },
    { label: 'Courses', icon: 'graduation-cap', link: '/app/courses' },
    { label: 'Library', icon: 'library', link: '/app/library' },
    { label: 'Settings', icon: 'settings', link: '/app/settings' },
  ];

  initial(): string {
    return (this.user()?.name ?? '?').charAt(0).toUpperCase();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
