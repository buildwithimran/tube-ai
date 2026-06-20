import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
