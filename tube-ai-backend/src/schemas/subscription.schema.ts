import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

/**
 * v1 rows are provider:'stub' (manual/admin grant). Swapping in a real gateway
 * (Paddle/LemonSqueezy/local) later = implement BillingProvider + webhook; this
 * schema and the entitlements engine don't change.
 */
@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  planKey: string;

  @Prop({ type: String, enum: ['active', 'canceled', 'expired', 'stub'], default: 'stub' })
  status: string;

  @Prop({ type: String, enum: ['stub', 'paddle', 'lemonsqueezy', 'local'], default: 'stub' })
  provider: string;

  @Prop()
  externalId?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  currentPeriodEnd?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
