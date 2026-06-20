import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { ReviewService, type Rating } from './review.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class AddDeckDto {
  @IsString()
  videoId: string;
}
class GradeDto {
  @IsIn(['again', 'hard', 'good', 'easy'])
  rating: Rating;
}

@Controller({ path: 'review', version: '1' })
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('due')
  due(@CurrentUser() user: AuthUser) {
    return this.review.due(user.userId);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.review.stats(user.userId);
  }

  @Post('decks')
  addDeck(@CurrentUser() user: AuthUser, @Body() dto: AddDeckDto) {
    return this.review.addDeck(user.userId, dto.videoId);
  }

  @Post(':cardId/grade')
  grade(
    @CurrentUser() user: AuthUser,
    @Param('cardId') cardId: string,
    @Body() dto: GradeDto,
  ) {
    return this.review.grade(user.userId, cardId, dto.rating);
  }
}
