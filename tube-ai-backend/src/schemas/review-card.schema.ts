import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewCardDocument = HydratedDocument<ReviewCard>;

/**
 * A single flashcard in a user's spaced-repetition queue. Scheduling uses an
 * SM-2-style algorithm (ease + interval). One row per (user, video, cardIndex).
 */
@Schema({ timestamps: true })
export class ReviewCard {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true })
  video: Types.ObjectId;

  @Prop({ required: true })
  cardIndex: number;

  @Prop({ required: true })
  front: string;

  @Prop({ required: true })
  back: string;

  @Prop({ default: 2.5 })
  ease: number;

  @Prop({ default: 0 })
  intervalDays: number;

  @Prop({ default: 0 })
  reps: number;

  @Prop({ default: 0 })
  lapses: number;

  @Prop({ type: Date, default: () => new Date(), index: true })
  dueAt: Date;
}

export const ReviewCardSchema = SchemaFactory.createForClass(ReviewCard);
ReviewCardSchema.index({ user: 1, video: 1, cardIndex: 1 }, { unique: true });
ReviewCardSchema.index({ user: 1, dueAt: 1 });
