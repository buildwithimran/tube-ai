import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

/**
 * One row per logged-in device = one refresh-token family (§47).
 * Stores the HASH of the refresh token (never plaintext). Rotation marks the old
 * row used and links `replacedBy`; presenting a used token = theft → revoke family.
 */
@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  /** sha256 hash of the opaque refresh token. */
  @Prop({ required: true, index: true })
  tokenHash: string;

  /** Token family id — all rotations of one login share it (reuse detection). */
  @Prop({ required: true, index: true })
  family: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  lastUsedAt?: Date;

  /** Set when rotated or logged out. A revoked token can never be used again. */
  @Prop()
  revokedAt?: Date;

  @Prop()
  replacedByHash?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
// TTL index: Mongo auto-purges expired sessions.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
