import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackService } from './feedback.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class CreateFeedbackDto {
  @IsOptional()
  @IsIn(['bug', 'feature', 'question', 'other'])
  category?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message: string;
}

@Controller({ path: 'feedback', version: '1' })
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(user.userId, dto.category ?? 'other', dto.message);
  }
}
