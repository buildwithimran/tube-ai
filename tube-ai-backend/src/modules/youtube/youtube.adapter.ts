import { Injectable, Logger } from '@nestjs/common';
import { Innertube } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';
import { TranscriptSource } from '../../common/enums/content-type.enum';

export interface VideoMeta {
  youtubeId: string;
  title?: string;
  channel?: string;
  durationSec: number;
  thumbnailUrl?: string;
  lang?: string;
}

export interface RawSegment {
  start: number; // seconds
  end: number;
  text: string;
}

export interface ExtractedTranscript {
  segments: RawSegment[];
  source: TranscriptSource;
  language: string;
}

export interface PlaylistVideo {
  youtubeId: string;
  title: string;
  durationText?: string;
}
export interface PlaylistMeta {
  playlistId: string;
  title: string;
  videos: PlaylistVideo[];
}

export interface SearchVideo {
  youtubeId: string;
  title: string;
  channel?: string;
  durationText?: string;
  thumbnail?: string;
}

/** Minimal HTML-entity decode for caption text (`&amp;#39;` → `'`). */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The swappable transcript/metadata adapter. Strategy chosen by R&D (PRODUCT-PLAN
 * §16): youtube-transcript (lang-forced) for captions, youtubei.js for metadata.
 * If the real `baoyu-youtube-transcript` skill is installed later, reimplement
 * this one class and nothing else changes.
 */
@Injectable()
export class YoutubeAdapter {
  private readonly logger = new Logger(YoutubeAdapter.name);
  private innertube?: Innertube;

  private async client(): Promise<Innertube> {
    if (!this.innertube) {
      this.innertube = await Innertube.create({ retrieve_player: false });
    }
    return this.innertube;
  }

  /** Accepts raw id, watch?v=, youtu.be, shorts, embed, with timestamps. */
  parseUrl(input: string): string | null {
    const trimmed = input.trim();
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    try {
      const url = new URL(trimmed);
      if (url.hostname.includes('youtu.be')) {
        const id = url.pathname.slice(1, 12);
        return /^[\w-]{11}$/.test(id) ? id : null;
      }
      const v = url.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(?:shorts|embed)\/([\w-]{11})/);
      if (m) return m[1];
    } catch {
      // not a URL — fall through to loose match
    }
    const loose = trimmed.match(/[\w-]{11}/);
    return loose ? loose[0] : null;
  }

  /** Metadata via Innertube (reliable; description-parser warnings are non-fatal). */
  async getMetadata(videoId: string): Promise<VideoMeta> {
    const yt = await this.client();
    const info = await yt.getInfo(videoId);
    const b = info.basic_info;
    return {
      youtubeId: videoId,
      title: b?.title ?? undefined,
      channel: b?.author ?? undefined,
      durationSec: b?.duration ?? 0,
      thumbnailUrl: b?.thumbnail?.[0]?.url,
    };
  }

  /** Captions via youtube-transcript with explicit language (fixes wrong-track bug). */
  async getTranscript(
    videoId: string,
    lang = 'en',
  ): Promise<ExtractedTranscript> {
    const fetchLang = async (l?: string) =>
      YoutubeTranscript.fetchTranscript(videoId, l ? { lang: l } : undefined);

    let items;
    let language = lang;
    let source = TranscriptSource.AUTO;
    try {
      items = await fetchLang(lang);
    } catch (err) {
      // Fallback: requested language unavailable → take whatever track exists.
      this.logger.warn(
        `No "${lang}" transcript for ${videoId}; falling back to default track`,
      );
      items = await fetchLang(undefined);
      language = 'auto';
      source = TranscriptSource.THIRD_PARTY;
    }

    // youtube-transcript returns offset/duration in MILLISECONDS → seconds.
    const segments: RawSegment[] = items.map((it) => {
      const start = (it.offset ?? 0) / 1000;
      const dur = (it.duration ?? 0) / 1000;
      return { start, end: start + dur, text: decodeEntities(it.text) };
    });

    return { segments, source, language };
  }

  /** Search YouTube for videos matching a query. */
  async searchVideos(query: string, limit = 12): Promise<SearchVideo[]> {
    const yt = await this.client();
    const res = await yt.search(query, { type: 'video' });
    const list: any[] = (res as any).results ?? (res as any).videos ?? [];
    return list
      .filter((v) => v?.id && (v.title || v.type === 'Video'))
      .slice(0, limit)
      .map((v) => ({
        youtubeId: v.id as string,
        title: (v.title?.text ?? v.title ?? '') as string,
        channel: v.author?.name as string | undefined,
        durationText: v.duration?.text as string | undefined,
        thumbnail: (v.thumbnails?.[0]?.url ?? v.thumbnail?.[0]?.url) as
          | string
          | undefined,
      }));
  }

  /** Accepts a playlist URL (?list=…) or a raw playlist id. */
  parsePlaylistUrl(input: string): string | null {
    const t = input.trim();
    if (/^(PL|UU|LL|FL|OL|RD)[\w-]{10,}$/.test(t)) return t;
    try {
      const list = new URL(t).searchParams.get('list');
      if (list) return list;
    } catch {
      // not a URL
    }
    return null;
  }

  async getPlaylist(playlistId: string): Promise<PlaylistMeta> {
    const yt = await this.client();
    const pl = await yt.getPlaylist(playlistId);
    const title = pl.info?.title ?? 'Playlist';
    const videos: PlaylistVideo[] = (pl.videos ?? [])
      .map((v: any) => ({
        youtubeId: v.id as string,
        title: (v.title?.text ?? v.title ?? '') as string,
        durationText: v.duration?.text as string | undefined,
      }))
      .filter((v) => !!v.youtubeId);
    return { playlistId, title, videos };
  }

  buildSrt(segments: RawSegment[]): string {
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const ts = (sec: number) => {
      const ms = Math.floor((sec % 1) * 1000);
      const s = Math.floor(sec) % 60;
      const m = Math.floor(sec / 60) % 60;
      const h = Math.floor(sec / 3600);
      return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
    };
    return segments
      .map(
        (seg, i) =>
          `${i + 1}\n${ts(seg.start)} --> ${ts(seg.end)}\n${seg.text}\n`,
      )
      .join('\n');
  }

  buildMarkdown(meta: VideoMeta, segments: RawSegment[]): string {
    const header = `# ${meta.title ?? 'Transcript'}\n\n_${meta.channel ?? ''}_\n\n`;
    const body = segments.map((s) => s.text).join(' ');
    return header + body;
  }
}
