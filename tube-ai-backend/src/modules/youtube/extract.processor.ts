import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExtractJobData, YoutubeService } from './youtube.service';

export const EXTRACT_QUEUE = 'extract';

/** BullMQ worker: runs heavy extraction off the request path (§19). */
@Processor(EXTRACT_QUEUE)
export class ExtractProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractProcessor.name);

  constructor(private readonly youtube: YoutubeService) {
    super();
  }

  async process(job: Job<ExtractJobData>) {
    this.logger.log(`Extracting ${job.data.url} (${job.data.lang})`);
    return this.youtube.runExtraction(job.data);
  }
}
