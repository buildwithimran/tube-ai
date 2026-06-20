import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiGenerationService, GenerateJobData } from './ai-generation.service';

export const GENERATE_QUEUE = 'generate';

@Processor(GENERATE_QUEUE)
export class GenerateProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerateProcessor.name);

  constructor(private readonly ai: AiGenerationService) {
    super();
  }

  async process(job: Job<GenerateJobData>) {
    this.logger.log(`Generating ${job.data.type} for video ${job.data.videoId}`);
    return this.ai.runGeneration(job.data);
  }
}
