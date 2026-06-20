import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuroraBg } from '../../shared/ui/aurora-bg/aurora-bg';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LucideAngularModule, AuroraBg],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  readonly steps = [
    { title: 'Paste a link', desc: 'Drop any YouTube URL into TubeAi.' },
    { title: 'AI reads the video', desc: 'We extract the transcript and understand it.' },
    { title: 'Get your Learning Pack', desc: 'Notes, flashcards, and a quiz — saved to your library.' },
  ];

  readonly features: Feature[] = [
    { icon: 'notebook-pen', title: 'Smart Notes', desc: 'Summaries + chapter notes + key takeaways.' },
    { icon: 'brain', title: 'Flashcards', desc: 'Active-recall cards built from the video.' },
    { icon: 'list-checks', title: 'Quiz', desc: 'Test yourself with auto-generated questions.' },
    { icon: 'clock', title: 'Timestamped transcript', desc: 'Search and jump to any moment.' },
    { icon: 'download', title: 'SRT subtitles', desc: 'Download captions in one click.' },
    { icon: 'library', title: 'Saved library', desc: 'Every pack you make, in one place.' },
  ];

  /** Dynamic copyright year (resolved once at construction). */
  readonly year = new Date().getFullYear();
}
