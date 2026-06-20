import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Video, VideoSchema } from '../../schemas/video.schema';
import { Transcript, TranscriptSchema } from '../../schemas/transcript.schema';
import { PlansModule } from '../plans/plans.module';
import { YoutubeAdapter } from './youtube.adapter';
import { YoutubeService } from './youtube.service';
import { YoutubeController } from './youtube.controller';
import { JobsController } from './jobs.controller';
import { ExtractProcessor, EXTRACT_QUEUE } from './extract.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: Transcript.name, schema: TranscriptSchema },
    ]),
    BullModule.registerQueue({ name: EXTRACT_QUEUE }),
    // Brings in UsageLimitGuard + EntitlementsService + UsageService.
    PlansModule,
  ],
  controllers: [YoutubeController, JobsController],
  providers: [YoutubeAdapter, YoutubeService, ExtractProcessor],
  exports: [YoutubeService],
})
export class YoutubeModule {}
