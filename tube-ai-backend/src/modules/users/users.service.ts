import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { AuthProvider, UserRole } from '../../common/enums/user-role.enum';
import type { AppConfig } from '../../config/configuration';

interface CreateUserInput {
  email: string;
  name: string;
  passwordHash?: string;
  provider?: AuthProvider;
  role?: UserRole;
  googleId?: string;
  avatar?: string;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Promote any existing accounts listed in ADMIN_EMAILS on boot. */
  async onModuleInit(): Promise<void> {
    const admins = this.config.get('adminEmails', { infer: true });
    if (admins.length) {
      await this.userModel
        .updateMany({ email: { $in: admins } }, { role: UserRole.ADMIN })
        .exec();
    }
  }

  create(input: CreateUserInput): Promise<UserDocument> {
    return this.userModel.create({
      ...input,
      provider: input.provider ?? AuthProvider.LOCAL,
    });
  }

  findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Includes the normally-hidden passwordHash — used only during login. */
  findByEmailWithSecret(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  /** Absolute-logout primitive: invalidates every outstanding access token. */
  async bumpTokenVersion(id: string | Types.ObjectId): Promise<number> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }, { new: true })
      .exec();
    return user?.tokenVersion ?? 0;
  }

  async setPasswordHash(
    id: string | Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { passwordHash }).exec();
  }

  async markEmailVerified(id: string | Types.ObjectId): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          emailVerified: true,
          $unset: { otpCodeHash: '', otpExpiresAt: '' },
        },
      )
      .exec();
  }

  /** Includes the normally-hidden OTP hash — used only during verification. */
  findByIdWithOtp(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('+otpCodeHash +otpExpiresAt +otpSentAt')
      .exec();
  }

  async setOtp(
    id: string | Types.ObjectId,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        { otpCodeHash: hash, otpExpiresAt: expiresAt, otpSentAt: new Date() },
      )
      .exec();
  }

  // --- Password reset ------------------------------------------------------

  /** Includes the normally-hidden reset fields — used only during reset. */
  findByEmailWithReset(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+resetCodeHash +resetExpiresAt +resetSentAt')
      .exec();
  }

  async setResetCode(
    id: string | Types.ObjectId,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          resetCodeHash: hash,
          resetExpiresAt: expiresAt,
          resetSentAt: new Date(),
        },
      )
      .exec();
  }

  /** Atomically set a new password and clear any pending reset code. */
  async resetPassword(
    id: string | Types.ObjectId,
    passwordHash: string,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          passwordHash,
          $unset: { resetCodeHash: '', resetExpiresAt: '', resetSentAt: '' },
        },
      )
      .exec();
  }
}
