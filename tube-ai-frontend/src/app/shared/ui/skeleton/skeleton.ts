import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmering placeholder bars that match content shape while loading. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly lines = input(3);

  get range(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => i);
  }
}
