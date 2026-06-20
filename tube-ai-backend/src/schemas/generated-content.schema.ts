import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ContentType } from '../common/enums/content-type.enum';

export type GeneratedContentDocument = HydratedDocument<GeneratedContent>;

/**
 * One AI output. `payload` is typed-per-`type` (Mixed): markdown string for
 * notes/summaries; structured arrays for quiz/flashcards. Quiz & flashcards live
 * here in payload (no separate collection) for MVP.
 */
@Schema({ timestamps: true })
export class GeneratedContent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  video: Types.ObjectId;

  @Prop({ type: String, enum: ContentType, required: true })
  type: ContentType;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ type: Object })
  payload: unknown;

  // Named aiModel (not "model") — "model" is reserved on Mongoose documents.
  @Prop()
  aiModel?: string;

  @Prop({ default: 0 })
  tokensUsed: number;

  /** Whether the user explicitly saved this to their library. */
  @Prop({ default: false, index: true })
  saved: boolean;
}

export const GeneratedContentSchema =
  SchemaFactory.createForClass(GeneratedContent);
GeneratedContentSchema.index({ user: 1, video: 1, type: 1 });
