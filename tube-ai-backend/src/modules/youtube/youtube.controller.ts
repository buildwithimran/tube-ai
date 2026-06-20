import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { ExtractDto, ValidateDto } from './dto/extract.dto';
import { EXTRACT_QUEUE } from './extract.processor';
import { UsageLimitGuard } from '../../common/guards/usage-limit.guard';
import { UsageAction } from '../../common/decorators/entitlement.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'videos', version: '1' })
export class YoutubeController {
  constructor(
    private readonly youtube: YoutubeService,
    @InjectQueue(EXTRACT_QUEUE) private readonly extractQueue: Queue,
  ) {}

  /** Cheap synchronous metadata preview. */
  @Post('validate')
  validate(@Body() dto: ValidateDto) {
    return this.youtube.validate(dto.url);
  }

  /** Enqueue heavy extraction; returns a jobId to poll (gated by daily quota). */
  @UseGuards(UsageLimitGuard)
  @UsageAction('extract')
  @Post('extract')
  async extract(@Body() dto: ExtractDto, @CurrentUser() user: AuthUser) {
    const job = await this.extractQueue.add(
      'extract',
      { url: dto.url, lang: dto.lang ?? 'en', userId: user.userId },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
    return { jobId: job.id };
  }

  /** Search YouTube (declared before :id so 'search' isn't treated as an id). */
  @Get('search')
  search(@Query('q') q = '') {
    return this.youtube.search(q);
  }

  @Get(':id')
  getVideo(@Param('id') id: string) {
    return this.youtube.getVideo(id);
  }

  @Get(':id/transcript')
  getTranscript(@Param('id') id: string, @Query('lang') lang = 'en') {
    return this.youtube.getTranscript(id, lang);
  }

  @Get(':id/srt')
  async srt(
    @Param('id') id: string,
    @Query('lang') lang = 'en',
    @Res() res: Response,
  ) {
    const transcript = await this.youtube.getTranscript(id, lang);
    res
      .set({
        'Content-Type': 'application/x-subrip; charset=utf-8',
        'Content-Disposition': `attachment; filename="${id}.srt"`,
      })
      .send(transcript?.srt ?? '');
  }
}
