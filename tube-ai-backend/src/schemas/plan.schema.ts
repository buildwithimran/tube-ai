import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanDocument = HydratedDocument<Plan>;

/** -1 = unlimited, throughout entitlements. */
@Schema({ _id: false })
export class Entitlements {
  @Prop({ default: 3 }) videosPerDay: number;
  @Prop({ default: 15 }) generationsPerDay: number;
  @Prop({ default: 1800 }) maxVideoDurationSec: number;
  @Prop({ default: 50 }) librarySize: number;
  /** Allowed output ContentTypes, or 'all'. */
  @Prop({ type: [String], default: ['summary_short', 'summary_long', 'chapter_notes', 'key_takeaways', 'quiz', 'flashcards'] })
  allowedOutputs: string[];
  @Prop({ default: false }) translation: boolean;
  @Prop({ default: false }) playlist: boolean;
  @Prop({ default: false }) pdfExport: boolean;
  @Prop({ default: false }) aiChat: boolean;
  @Prop({ default: false }) removeWatermark: boolean;
  @Prop({ default: false }) prioritySupport: boolean;
}
const EntitlementsSchema = SchemaFactory.createForClass(Entitlements);

@Schema({ _id: false })
export class PlanPrice {
  @Prop({ default: 0 }) monthly: number;
  @Prop({ default: 0 }) yearly: number;
  @Prop({ default: 'USD' }) currency: string;
}
const PlanPriceSchema = SchemaFactory.createForClass(PlanPrice);

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true, index: true })
  key: string; // 'free' | 'pro' | ...

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  badge?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: PlanPriceSchema, default: () => ({}) })
  price: PlanPrice;

  @Prop({ type: EntitlementsSchema, default: () => ({}) })
  entitlements: Entitlements;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
