import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UsageLogDocument = HydratedDocument<UsageLog>;

/** Drives daily limit checks (count today's rows) and admin metrics. */
@Schema({ timestamps: true })
export class UsageLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['extract', 'generate'], required: true })
  action: string;

  @Prop({ type: Types.ObjectId, ref: 'Video' })
  video?: Types.ObjectId;

  @Prop()
  contentType?: string;

  @Prop({ default: 0 })
  tokensUsed: number;
}

export const UsageLogSchema = SchemaFactory.createForClass(UsageLog);
UsageLogSchema.index({ user: 1, createdAt: -1 });
