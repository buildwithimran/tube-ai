import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReviewCard,
  ReviewCardDocument,
} from '../../schemas/review-card.schema';
import {
  GeneratedContent,
  GeneratedContentDocument,
} from '../../schemas/generated-content.schema';
import { ContentType } from '../../common/enums/content-type.enum';

export type Rating = 'again' | 'hard' | 'good' | 'easy';
const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewCard.name)
    private readonly reviewModel: Model<ReviewCardDocument>,
    @InjectModel(GeneratedContent.name)
    private readonly genModel: Model<GeneratedContentDocument>,
  ) {}

  /** Add a video's flashcards into the user's spaced-repetition queue. */
  async addDeck(userId: string, videoId: string): Promise<{ added: number }> {
    // Generated content is cached per-video (shared across users), so look it up
    // by video — not user. The review schedule below is still per-user.
    const flashcards = await this.genModel
      .findOne({
        video: new Types.ObjectId(videoId),
        type: ContentType.FLASHCARDS,
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const cards = (flashcards?.payload as { cards?: { front: string; back: string }[] })
      ?.cards;
    if (!cards?.length) {
      throw new BadRequestException('Generate flashcards for this video first.');
    }

    let added = 0;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (!c?.front || !c?.back) continue;
      const res = await this.reviewModel.updateOne(
        {
          user: new Types.ObjectId(userId),
          video: new Types.ObjectId(videoId),
          cardIndex: i,
        },
        {
          $set: { front: c.front, back: c.back },
          $setOnInsert: {
            ease: 2.5,
            intervalDays: 0,
            reps: 0,
            lapses: 0,
            dueAt: new Date(),
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) added++;
    }
    return { added };
  }

  /** Cards due now, oldest-due first. */
  due(userId: string, limit = 30) {
    return this.reviewModel
      .find({ user: new Types.ObjectId(userId), dueAt: { $lte: new Date() } })
      .sort({ dueAt: 1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async stats(userId: string): Promise<{ total: number; due: number }> {
    const user = new Types.ObjectId(userId);
    const [total, due] = await Promise.all([
      this.reviewModel.countDocuments({ user }),
      this.reviewModel.countDocuments({ user, dueAt: { $lte: new Date() } }),
    ]);
    return { total, due };
  }

  /** Apply an SM-2-style schedule update for a graded card. */
  async grade(userId: string, cardId: string, rating: Rating) {
    const card = await this.reviewModel.findOne({
      _id: cardId,
      user: new Types.ObjectId(userId),
    });
    if (!card) throw new NotFoundException('Review card not found');

    const now = Date.now();
    if (rating === 'again') {
      card.ease = Math.max(1.3, card.ease - 0.2);
      card.reps = 0;
      card.lapses += 1;
      card.intervalDays = 0;
      card.dueAt = new Date(now + 10 * 60 * 1000); // 10 minutes
    } else {
      let interval: number;
      if (rating === 'hard') {
        card.ease = Math.max(1.3, card.ease - 0.15);
        interval = Math.max(1, Math.round((card.intervalDays || 1) * 1.2));
      } else if (rating === 'good') {
        interval =
          card.reps === 0
            ? 1
            : card.reps === 1
              ? 3
              : Math.round(card.intervalDays * card.ease);
      } else {
        card.ease += 0.15;
        interval =
          card.reps === 0 ? 3 : Math.round(card.intervalDays * card.ease * 1.3);
      }
      card.reps += 1;
      card.intervalDays = interval;
      card.dueAt = new Date(now + interval * DAY);
    }
    await card.save();
    return { dueAt: card.dueAt, intervalDays: card.intervalDays };
  }
}
