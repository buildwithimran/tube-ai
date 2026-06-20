import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  signal,
  viewChildren,
} from '@angular/core';

@Component({
  selector: 'app-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './otp-input.html',
  styleUrl: './otp-input.css',
})
export class OtpInput {
  readonly length = 6;
  readonly digits = signal<string[]>(Array(6).fill(''));
  readonly completed = output<string>();

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  onInput(i: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value
      .replace(/\D/g, '')
      .slice(-1);
    this.setDigit(i, value);
    if (value && i < this.length - 1) this.focus(i + 1);
    this.emitIfComplete();
  }

  onKeydown(i: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[i] && i > 0) {
      this.focus(i - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData
      ?.getData('text')
      ?.replace(/\D/g, '')
      .slice(0, this.length);
    if (!text) return;
    event.preventDefault();
    const arr = (text + ' '.repeat(this.length))
      .slice(0, this.length)
      .split('')
      .map((c) => (c === ' ' ? '' : c));
    this.digits.set(arr);
    this.focus(Math.min(text.length, this.length - 1));
    this.emitIfComplete();
  }

  reset(): void {
    this.digits.set(Array(this.length).fill(''));
    this.focus(0);
  }

  private setDigit(i: number, value: string): void {
    this.digits.update((d) => {
      const next = [...d];
      next[i] = value;
      return next;
    });
  }

  private focus(i: number): void {
    this.boxes()[i]?.nativeElement.focus();
  }

  private emitIfComplete(): void {
    const code = this.digits().join('');
    if (/^\d{6}$/.test(code)) this.completed.emit(code);
  }
}
