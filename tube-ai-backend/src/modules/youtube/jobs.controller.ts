import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EXTRACT_QUEUE } from './extract.processor';
import { mapJobState } from '../../common/jobs.util';

/** Poll endpoint for async jobs — the frontend uses this to drive the timeline. */
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(
    @InjectQueue(EXTRACT_QUEUE) private readonly extractQueue: Queue,
  ) {}

  @Get(':id')
  async status(@Param('id') id: string) {
    const job = await this.extractQueue.getJob(id);
    if (!job) throw new NotFoundException('Job not found');
    const state = await job.getState();
    return {
      jobId: id,
      status: mapJobState(state),
      progress: job.progress,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }
}
