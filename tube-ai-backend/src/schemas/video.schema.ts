import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VideoDocument = HydratedDocument<Video>;

@Schema({ _id: false })
export class Chapter {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) startSec: number;
}
const ChapterSchema = SchemaFactory.createForClass(Chapter);

/**
 * One document per YouTube video, shared across all users (extract once, reuse
 * forever — the core cost-saving cache). Keyed by youtubeId.
 */
@Schema({ timestamps: true })
export class Video {
  @Prop({ required: true, unique: true, index: true })
  youtubeId: string;

  @Prop()
  title?: string;

  @Prop()
  channel?: string;

  @Prop({ default: 0 })
  durationSec: number;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  lang?: string;

  @Prop({ type: [ChapterSchema], default: [] })
  chapters: Chapter[];

  @Prop()
  publishedAt?: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
