import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import {
  Transcript,
  TranscriptDocument,
} from '../../schemas/transcript.schema';
import {
  YoutubeAdapter,
  VideoMeta,
  PlaylistMeta,
  SearchVideo,
} from './youtube.adapter';
import { UsageService } from '../usage/usage.service';

export interface ExtractJobData {
  url: string;
  lang: string;
  userId: string;
}

export interface ExtractResult {
  videoId: string;
  youtubeId: string;
  transcriptId: string;
  language: string;
  cached: boolean;
  meta: VideoMeta;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(
    private readonly adapter: YoutubeAdapter,
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    @InjectModel(Transcript.name)
    private readonly transcriptModel: Model<TranscriptDocument>,
    private readonly usage: UsageService,
  ) {}

  /** Search YouTube for videos to turn into packs. */
  search(query: string): Promise<SearchVideo[]> {
    const q = query.trim();
    if (!q) return Promise.resolve([]);
    return this.adapter.searchVideos(q);
  }

  /** Resolve a playlist URL → its videos (for Course creation). */
  async getPlaylistFromUrl(url: string): Promise<PlaylistMeta> {
    const id = this.adapter.parsePlaylistUrl(url);
    if (!id) throw new BadRequestException('Not a valid YouTube playlist URL');
    return this.adapter.getPlaylist(id);
  }

  /** Cheap, synchronous preview for the "validate URL" step. */
  async validate(url: string): Promise<{ videoId: string; meta: VideoMeta }> {
    const videoId = this.adapter.parseUrl(url);
    if (!videoId) throw new BadRequestException('Not a valid YouTube URL');
    const meta = await this.adapter.getMetadata(videoId);
    return { videoId, meta };
  }

  /**
   * The heavy extraction (runs in the queue worker). Cache-first: a video is
   * extracted once and reused forever (the core cost saver, §18).
   */
  async runExtraction(data: ExtractJobData): Promise<ExtractResult> {
    const youtubeId = this.adapter.parseUrl(data.url);
    if (!youtubeId) throw new BadRequestException('Not a valid YouTube URL');

    // 1) Upsert the shared Video doc (metadata).
    let video = await this.videoModel.findOne({ youtubeId });
    let meta: VideoMeta;
    if (!video) {
      meta = await this.adapter.getMetadata(youtubeId);
      video = await this.videoModel.create({
        youtubeId,
        title: meta.title,
        channel: meta.channel,
        durationSec: meta.durationSec,
        thumbnailUrl: meta.thumbnailUrl,
        lang: data.lang,
      });
    } else {
      meta = {
        youtubeId,
        title: video.title,
        channel: video.channel,
        durationSec: video.durationSec,
        thumbnailUrl: video.thumbnailUrl,
      };
    }

    // 2) Transcript cache hit?
    const existing = await this.transcriptModel.findOne({
      video: video._id,
      language: data.lang,
    });
    if (existing) {
      return this.result(video, existing, meta, true);
    }

    // 3) Extract. The actual language may differ from requested (fallback to a
    //    default track returns 'auto'), so re-check the cache for it.
    const extracted = await this.adapter.getTranscript(youtubeId, data.lang);
    const cachedForActual = await this.transcriptModel.findOne({
      video: video._id,
      language: extracted.language,
    });
    if (cachedForActual) {
      return this.result(video, cachedForActual, meta, true);
    }

    const srt = this.adapter.buildSrt(extracted.segments);
    const markdown = this.adapter.buildMarkdown(meta, extracted.segments);

    // Idempotent upsert on (video, language) — avoids E11000 on the unique index.
    const transcript = await this.transcriptModel.findOneAndUpdate(
      { video: video._id, language: extracted.language },
      {
        $set: {
          source: extracted.source,
          segments: extracted.segments,
          srt,
          markdown,
        },
        $setOnInsert: { video: video._id, language: extracted.language },
      },
      { upsert: true, new: true },
    );

    await this.usage.log({
      user: data.userId,
      action: 'extract',
      video: video.id as string,
    });

    return this.result(video, transcript!, meta, false);
  }

  private result(
    video: VideoDocument,
    transcript: TranscriptDocument,
    meta: VideoMeta,
    cached: boolean,
  ): ExtractResult {
    return {
      videoId: video.id as string,
      youtubeId: video.youtubeId,
      transcriptId: transcript.id as string,
      language: transcript.language,
      cached,
      meta,
    };
  }

  getVideo(id: string) {
    return this.videoModel.findById(id).lean().exec();
  }

  async getTranscript(videoId: string, lang: string) {
    // Prefer the requested language, but fall back to whatever track exists
    // (e.g. extraction stored an 'auto' track when 'en' wasn't available).
    const videoOid = new Types.ObjectId(videoId);
    const exact = await this.transcriptModel
      .findOne({ video: videoOid, language: lang })
      .lean()
      .exec();
    return (
      exact ??
      (await this.transcriptModel.findOne({ video: videoOid }).lean().exec())
    );
  }
}
