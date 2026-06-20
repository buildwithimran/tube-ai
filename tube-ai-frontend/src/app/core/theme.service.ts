import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** Light-first ("Aurora Light") with a "Cosmic Night" dark toggle. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  readonly dark = signal(false);

  toggle(): void {
    this.dark.update((d) => !d);
    this.apply();
  }

  private apply(): void {
    this.doc.documentElement.classList.toggle('dark', this.dark());
  }
}
