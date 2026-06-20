import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Renders Markdown to sanitized HTML. Used for AI notes/summaries. */
@Component({
  selector: 'app-markdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './markdown.html',
  styleUrl: './markdown.css',
})
export class Markdown {
  readonly content = input<string>('');

  readonly html = computed(() => {
    const raw = marked.parse(this.content() ?? '', { async: false }) as string;
    return DOMPurify.sanitize(raw);
  });
}
