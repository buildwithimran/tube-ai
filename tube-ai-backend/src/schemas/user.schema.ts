import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuthProvider, UserRole } from '../common/enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  /** argon2id hash. `select:false` → never returned unless explicitly selected. */
  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  avatar?: string;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Prop()
  googleId?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER, index: true })
  role: UserRole;

  @Prop({ default: false })
  emailVerified: boolean;

  // --- Email OTP verification (§Phase 4) -----------------------------------
  @Prop({ select: false })
  otpCodeHash?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop()
  otpSentAt?: Date;

  // --- Password reset ------------------------------------------------------
  @Prop({ select: false })
  resetCodeHash?: string;

  @Prop({ select: false })
  resetExpiresAt?: Date;

  @Prop({ select: false })
  resetSentAt?: Date;

  // --- Plan / entitlements (§20) -------------------------------------------
  @Prop({ type: String, default: 'free', index: true })
  planKey: string;

  @Prop({ type: String, enum: ['active', 'trialing', 'expired'], default: 'active' })
  planStatus: string;

  @Prop()
  planExpiresAt?: Date;

  // --- Security (§47) ------------------------------------------------------
  /** Bumping this invalidates ALL outstanding access tokens = absolute logout. */
  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
