import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TranscriptSource } from '../common/enums/content-type.enum';

export type TranscriptDocument = HydratedDocument<Transcript>;

@Schema({ _id: false })
export class TranscriptSegment {
  @Prop({ required: true }) start: number; // seconds
  @Prop({ required: true }) end: number;
  @Prop({ required: true }) text: string;
  @Prop() speaker?: string;
}
const TranscriptSegmentSchema = SchemaFactory.createForClass(TranscriptSegment);

/** Cached per (video, language) — the unique compound index is the cache key. */
@Schema({ timestamps: true })
export class Transcript {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  video: Types.ObjectId;

  @Prop({ required: true })
  language: string;

  @Prop({ type: String, enum: TranscriptSource, default: TranscriptSource.AUTO })
  source: TranscriptSource;

  @Prop({ type: [TranscriptSegmentSchema], default: [] })
  segments: TranscriptSegment[];

  @Prop()
  markdown?: string;

  @Prop()
  srt?: string;
}

export const TranscriptSchema = SchemaFactory.createForClass(Transcript);
TranscriptSchema.index({ video: 1, language: 1 }, { unique: true });
