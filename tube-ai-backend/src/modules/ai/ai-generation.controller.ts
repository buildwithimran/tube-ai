import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerateDto } from './dto/generate.dto';
import { GENERATE_QUEUE } from './generate.processor';
import { EntitlementsService } from '../plans/entitlements.service';
import { UsageLimitGuard } from '../../common/guards/usage-limit.guard';
import { UsageAction } from '../../common/decorators/entitlement.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { mapJobState } from '../../common/jobs.util';

@Controller({ path: 'generate', version: '1' })
export class AiGenerationController {
  constructor(
    private readonly entitlements: EntitlementsService,
    @InjectQueue(GENERATE_QUEUE) private readonly queue: Queue,
  ) {}

  @UseGuards(UsageLimitGuard)
  @UsageAction('generate')
  @Post()
  async generate(@Body() dto: GenerateDto, @CurrentUser() user: AuthUser) {
    // Plan-level output gate (Free = Learning Pack only; Pro = all).
    const ent = await this.entitlements.forUser(user.userId);
    if (!this.entitlements.allowsOutput(ent, dto.type)) {
      throw new HttpException(
        {
          error: 'FeatureLocked',
          message: `Your plan doesn't include "${dto.type}".`,
          feature: dto.type,
          upgradeTo: 'pro',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const job = await this.queue.add(
      'generate',
      {
        videoId: dto.videoId,
        type: dto.type,
        lang: dto.lang ?? 'en',
        userId: user.userId,
        fresh: dto.fresh ?? false,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    );
    return { jobId: job.id };
  }

  @Get(':jobId')
  async status(@Param('jobId') id: string) {
    const job = await this.queue.getJob(id);
    if (!job) throw new NotFoundException('Job not found');
    const state = await job.getState();
    return {
      jobId: id,
      status: mapJobState(state),
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }
}
