import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Full-bleed animated aurora background. Drop once per page (fixed, behind content). */
@Component({
  selector: 'app-aurora-bg',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="aurora-bg" aria-hidden="true"></div>`,
})
export class AuroraBg {}
