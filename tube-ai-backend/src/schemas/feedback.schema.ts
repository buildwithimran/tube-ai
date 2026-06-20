import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FeedbackDocument = HydratedDocument<Feedback>;

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  user?: Types.ObjectId;

  @Prop({ type: String, enum: ['bug', 'feature', 'question', 'other'], default: 'other' })
  category: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: String, enum: ['open', 'resolved'], default: 'open', index: true })
  status: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
