import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ReviewCard,
  ReviewCardSchema,
} from '../../schemas/review-card.schema';
import {
  GeneratedContent,
  GeneratedContentSchema,
} from '../../schemas/generated-content.schema';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewCard.name, schema: ReviewCardSchema },
      { name: GeneratedContent.name, schema: GeneratedContentSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
