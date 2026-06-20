import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Flashcard } from './models';

const safe = (s: string) =>
  (s || 'tubeai').replace(/[^\w\- ]/g, '').slice(0, 60).trim() || 'tubeai';

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly doc = inject(DOCUMENT);

  private trigger(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Save raw text (markdown export). */
  text(filename: string, text: string, mime = 'text/plain'): void {
    this.trigger(new Blob([text], { type: mime }), filename);
  }

  /** Download the video's cover image (maxres → hq fallback). */
  async thumbnail(youtubeId: string, title: string): Promise<void> {
    const tryUrls = [
      `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    ];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 1000) {
            this.trigger(blob, `${safe(title)}-thumbnail.jpg`);
            return;
          }
        }
      } catch {
        // try next
      }
    }
    throw new Error('Thumbnail unavailable');
  }

  /** Flashcards → Anki-importable CSV (quoted, comma-separated front,back). */
  ankiCsv(filename: string, cards: Flashcard[]): void {
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    const body = cards.map((c) => `${esc(c.front)},${esc(c.back)}`).join('\n');
    this.text(filename, body, 'text/csv');
  }

  /** Notes markdown → multi-page PDF (text). */
  pdf(title: string, markdown: string): void {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageH = pdf.internal.pageSize.getHeight() - margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(pdf.splitTextToSize(title || 'Learning Pack', width), margin, 50);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const clean = (markdown || '').replace(/[#*_`>]/g, '').replace(/\n{3,}/g, '\n\n');
    const lines = pdf.splitTextToSize(clean, width) as string[];

    let y = 84;
    for (const line of lines) {
      if (y > pageH) {
        pdf.addPage();
        y = 50;
      }
      pdf.text(line, margin, y);
      y += 16;
    }
    pdf.save(`${safe(title)}.pdf`);
  }
}
