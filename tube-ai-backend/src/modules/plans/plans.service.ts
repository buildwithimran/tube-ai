import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import type { AppConfig } from '../../config/configuration';

const LEARNING_PACK_OUTPUTS = [
  'summary_short',
  'summary_long',
  'chapter_notes',
  'key_takeaways',
  'quiz',
  'flashcards',
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Seed Free + Pro once, idempotently, on boot. Admin edits them afterward. */
  async onModuleInit(): Promise<void> {
    const free = this.config.get('freeLimits', { infer: true });

    await this.upsertIfMissing('free', {
      key: 'free',
      name: 'Free',
      description: 'Your Learning Pack — notes, flashcards, and a quiz from any video.',
      isDefault: true,
      sortOrder: 0,
      price: { monthly: 0, yearly: 0, currency: 'USD' },
      entitlements: {
        videosPerDay: free.videosPerDay,
        generationsPerDay: free.generationsPerDay,
        maxVideoDurationSec: free.maxVideoDurationSec,
        librarySize: 50,
        allowedOutputs: LEARNING_PACK_OUTPUTS,
        translation: false,
        playlist: false,
        pdfExport: false,
        aiChat: false,
        removeWatermark: false,
        prioritySupport: false,
      },
    });

    await this.upsertIfMissing('pro', {
      key: 'pro',
      name: 'Pro',
      badge: 'Most popular',
      description: 'Unlimited videos, every output type, no watermark.',
      isDefault: false,
      sortOrder: 1,
      price: { monthly: 9, yearly: 90, currency: 'USD' },
      entitlements: {
        videosPerDay: -1,
        generationsPerDay: -1,
        maxVideoDurationSec: 10800, // 3 hr
        librarySize: -1,
        allowedOutputs: ['all'],
        translation: true,
        playlist: true,
        pdfExport: true,
        aiChat: true,
        removeWatermark: true,
        prioritySupport: true,
      },
    });
  }

  private async upsertIfMissing(
    key: string,
    doc: Partial<Plan>,
  ): Promise<void> {
    const existing = await this.planModel.exists({ key });
    if (!existing) {
      await this.planModel.create(doc);
      this.logger.log(`Seeded plan: ${key}`);
    }
  }

  listActive() {
    return this.planModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean().exec();
  }

  getByKey(key: string) {
    return this.planModel.findOne({ key }).lean().exec();
  }

  getDefault() {
    return this.planModel.findOne({ isDefault: true }).lean().exec();
  }
}
