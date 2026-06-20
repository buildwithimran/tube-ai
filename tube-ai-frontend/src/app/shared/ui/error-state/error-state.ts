import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-error-state',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
})
export class ErrorState {
  readonly title = input('Something went wrong');
  readonly message = input('Please try again.');
  readonly retryLabel = input('Try again');
  readonly retry = output<void>();
}
