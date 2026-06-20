import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Video, VideoSchema } from '../../schemas/video.schema';
import { Transcript, TranscriptSchema } from '../../schemas/transcript.schema';
import {
  GeneratedContent,
  GeneratedContentSchema,
} from '../../schemas/generated-content.schema';
import { ConfigService } from '@nestjs/config';
import { PlansModule } from '../plans/plans.module';
import { AiProvider, GeminiProvider, GroqProvider } from './ai.provider';
import { AiGenerationService } from './ai-generation.service';
import { AiGenerationController } from './ai-generation.controller';
import { GenerateProcessor, GENERATE_QUEUE } from './generate.processor';
import type { AppConfig } from '../../config/configuration';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: Transcript.name, schema: TranscriptSchema },
      { name: GeneratedContent.name, schema: GeneratedContentSchema },
    ]),
    BullModule.registerQueue({ name: GENERATE_QUEUE }),
    PlansModule,
  ],
  controllers: [AiGenerationController],
  providers: [
    GeminiProvider,
    GroqProvider,
    {
      // Pick the live provider from config (AI_PROVIDER). Default: groq.
      provide: AiProvider,
      inject: [ConfigService, GeminiProvider, GroqProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        gemini: GeminiProvider,
        groq: GroqProvider,
      ) =>
        config.get('ai', { infer: true }).provider === 'gemini' ? gemini : groq,
    },
    AiGenerationService,
    GenerateProcessor,
  ],
  exports: [AiGenerationService],
})
export class AiGenerationModule {}
