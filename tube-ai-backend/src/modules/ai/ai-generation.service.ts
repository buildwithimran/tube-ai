import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from '../../schemas/video.schema';
import {
  Transcript,
  TranscriptDocument,
} from '../../schemas/transcript.schema';
import {
  GeneratedContent,
  GeneratedContentDocument,
} from '../../schemas/generated-content.schema';
import { ContentType } from '../../common/enums/content-type.enum';
import { UsageService } from '../usage/usage.service';
import { AiProvider } from './ai.provider';
import { buildPrompt } from './prompts';

export interface GenerateJobData {
  videoId: string;
  type: ContentType;
  lang: string;
  userId: string;
  /** Force a fresh generation instead of returning the cached result. */
  fresh?: boolean;
}

// Keep within free-tier context comfortably; map-reduce chunking is a later upgrade.
const MAX_TRANSCRIPT_CHARS = 200_000;

@Injectable()
export class AiGenerationService {
  constructor(
    private readonly provider: AiProvider,
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    @InjectModel(Transcript.name)
    private readonly transcriptModel: Model<TranscriptDocument>,
    @InjectModel(GeneratedContent.name)
    private readonly genModel: Model<GeneratedContentDocument>,
    private readonly usage: UsageService,
  ) {}

  async runGeneration(data: GenerateJobData) {
    const video = await this.videoModel.findById(data.videoId).lean();
    if (!video) throw new NotFoundException('Video not found');

    const videoOid = new Types.ObjectId(data.videoId);

    // Reuse a previous generation of the same kind unless a fresh one is
    // requested. This guarantees the pack stays in the user's history, keeps
    // re-opens instant, and avoids re-spending AI tokens on every visit.
    if (!data.fresh) {
      const existing = await this.genModel
        .findOne({
          user: new Types.ObjectId(data.userId),
          video: videoOid,
          type: data.type,
          language: data.lang,
        })
        .sort({ updatedAt: -1 })
        .lean();
      if (existing) {
        return {
          generatedId: String(existing._id),
          type: existing.type,
          language: existing.language,
          payload: existing.payload,
          model: existing.aiModel,
          tokensUsed: existing.tokensUsed,
          reused: true,
        };
      }
    }

    const transcript =
      (await this.transcriptModel
        .findOne({ video: videoOid, language: data.lang })
        .lean()) ??
      (await this.transcriptModel.findOne({ video: videoOid }).lean());
    if (!transcript) {
      throw new BadRequestException('Transcript not ready — extract the video first');
    }

    const text =
      transcript.markdown ??
      transcript.segments.map((s) => s.text).join(' ');
    const capped = text.slice(0, MAX_TRANSCRIPT_CHARS);

    const spec = buildPrompt(data.type, {
      title: video.title,
      channel: video.channel,
      transcript: capped,
      language: data.lang,
    });

    const result = await this.provider.generate(spec.prompt, {
      tier: spec.tier,
      system: spec.system,
      json: spec.json,
      schema: spec.schema,
      temperature: spec.json ? 0.4 : 0.7,
    });

    let payload: unknown = result.text;
    if (spec.json) {
      try {
        payload = JSON.parse(result.text);
      } catch {
        throw new UnprocessableEntityException('AI returned invalid JSON');
      }
    }

    const gen = await this.genModel.create({
      user: new Types.ObjectId(data.userId),
      video: videoOid,
      type: data.type,
      language: data.lang,
      payload,
      aiModel: result.model,
      tokensUsed: result.tokensUsed,
    });

    await this.usage.log({
      user: data.userId,
      action: 'generate',
      video: data.videoId,
      contentType: data.type,
      tokensUsed: result.tokensUsed,
    });

    return {
      generatedId: gen.id as string,
      type: data.type,
      language: data.lang,
      payload,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  }
}
