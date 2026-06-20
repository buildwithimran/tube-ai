import { Injectable, signal } from '@angular/core';

/** "Listen mode" — reads notes aloud via the browser's free Web Speech API. */
@Injectable({ providedIn: 'root' })
export class TtsService {
  readonly playing = signal(false);
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  speak(text: string): void {
    if (!this.supported || !text) return;
    this.stop();
    const clean = text
      .replace(/[#*_`>\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1;
    utter.onend = () => this.playing.set(false);
    utter.onerror = () => this.playing.set(false);
    this.playing.set(true);
    window.speechSynthesis.speak(utter);
  }

  stop(): void {
    if (this.supported) window.speechSynthesis.cancel();
    this.playing.set(false);
  }

  toggle(text: string): void {
    if (this.playing()) this.stop();
    else this.speak(text);
  }
}
