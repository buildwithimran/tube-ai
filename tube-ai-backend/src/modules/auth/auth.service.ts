import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { ConfigService } from '@nestjs/config';
import { Session, SessionDocument } from '../../schemas/session.schema';
import { UserDocument } from '../../schemas/user.schema';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { TokenService, AccessTokenPayload } from './token.service';
import { RegisterDto } from './dto/register.dto';
import type { AppConfig } from '../../config/configuration';
import {
  ALLOWED_EMAIL_PROVIDERS_HINT,
  isAllowedEmailDomain,
} from '../../common/email-domains';

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<AppConfig, true>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  // --- Email OTP verification (Phase 4) ------------------------------------

  async generateAndSendOtp(user: UserDocument): Promise<void> {
    if (user.emailVerified) return;
    if (
      user.otpSentAt &&
      Date.now() - new Date(user.otpSentAt).getTime() < 30_000
    ) {
      throw new BadRequestException('Please wait a moment before requesting another code.');
    }
    const code = randomInt(100000, 1000000).toString();
    await this.users.setOtp(
      user.id as string,
      this.tokens.hash(code),
      new Date(Date.now() + 10 * 60 * 1000),
    );
    await this.mail.sendOtp(user.email, code, user.name);
  }

  async verifyOtp(userId: string, code: string): Promise<void> {
    const user = await this.users.findByIdWithOtp(userId);
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return;
    if (!user.otpCodeHash || !user.otpExpiresAt) {
      throw new BadRequestException('No code pending — request a new one.');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expired — request a new one.');
    }
    if (this.tokens.hash(code) !== user.otpCodeHash) {
      throw new BadRequestException('Invalid code.');
    }
    await this.users.markEmailVerified(userId);
  }

  // --- Password reset ------------------------------------------------------

  /**
   * Email a reset code. Always resolves (never reveals whether the email is
   * registered) — the controller returns the same response regardless.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmailWithReset(email.toLowerCase());
    if (!user) return; // silent — don't leak account existence
    if (
      user.resetSentAt &&
      Date.now() - new Date(user.resetSentAt).getTime() < 30_000
    ) {
      return; // throttle quietly
    }
    const code = randomInt(100000, 1000000).toString();
    await this.users.setResetCode(
      user.id as string,
      this.tokens.hash(code),
      new Date(Date.now() + 10 * 60 * 1000),
    );
    await this.mail.sendPasswordReset(user.email, code, user.name);
  }

  /** Verify the reset code and set a new password; logs out every session. */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findByEmailWithReset(email.toLowerCase());
    if (!user?.resetCodeHash || !user.resetExpiresAt) {
      throw new BadRequestException('Invalid or expired reset code.');
    }
    if (user.resetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset code has expired — request a new one.');
    }
    if (this.tokens.hash(code) !== user.resetCodeHash) {
      throw new BadRequestException('Invalid reset code.');
    }
    const passwordHash = await argonHash(newPassword);
    await this.users.resetPassword(user.id as string, passwordHash);
    // Security: invalidate every existing session/token after a reset.
    await this.logoutAll(user.id as string);
  }

  // --- credentials ---------------------------------------------------------

  async register(dto: RegisterDto): Promise<UserDocument> {
    const email = dto.email.toLowerCase();
    if (!isAllowedEmailDomain(email)) {
      throw new BadRequestException(
        `Please sign up with a supported email provider (${ALLOWED_EMAIL_PROVIDERS_HINT}).`,
      );
    }
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argonHash(dto.password); // argon2id by default
    const adminEmails = this.config.get('adminEmails', { infer: true });
    const role = adminEmails.includes(email) ? UserRole.ADMIN : UserRole.USER;

    return this.users.create({
      email,
      name: dto.name,
      passwordHash,
      role,
    });
  }

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.users.findByEmailWithSecret(email);
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await argonVerify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  // --- token / session lifecycle (§47) -------------------------------------

  private accessPayload(user: UserDocument): AccessTokenPayload {
    return {
      sub: user.id as string,
      email: user.email,
      role: user.role,
      plan: user.planKey,
      tv: user.tokenVersion,
    };
  }

  /** New login → new token family + first refresh row. */
  async startSession(
    user: UserDocument,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const refreshToken = this.tokens.generateRefreshToken();
    await this.sessionModel.create({
      user: user._id,
      tokenHash: this.tokens.hash(refreshToken),
      family: this.tokens.newFamilyId(),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      lastUsedAt: new Date(),
    });
    return {
      accessToken: this.tokens.signAccessToken(this.accessPayload(user)),
      refreshToken,
    };
  }

  /**
   * Rotate a refresh token. Detects reuse of an already-rotated token (= theft)
   * and kills the whole family. Returns fresh access + refresh tokens.
   */
  async rotate(
    rawRefresh: string,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const session = await this.sessionModel.findOne({
      tokenHash: this.tokens.hash(rawRefresh),
    });
    if (!session) throw new UnauthorizedException('Invalid session');

    if (session.revokedAt) {
      // Reuse of a revoked/rotated token → compromise → revoke entire family.
      await this.sessionModel.updateMany(
        { family: session.family, revokedAt: { $exists: false } },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Session reuse detected — logged out');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.users.findById(session.user);
    if (!user) throw new UnauthorizedException();

    const newRefresh = this.tokens.generateRefreshToken();
    const newHash = this.tokens.hash(newRefresh);

    session.revokedAt = new Date();
    session.replacedByHash = newHash;
    await session.save();

    await this.sessionModel.create({
      user: user._id,
      tokenHash: newHash,
      family: session.family,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      lastUsedAt: new Date(),
    });

    return {
      accessToken: this.tokens.signAccessToken(this.accessPayload(user)),
      refreshToken: newRefresh,
    };
  }

  /** Logout this device only. */
  async logout(rawRefresh?: string): Promise<void> {
    if (!rawRefresh) return;
    await this.sessionModel.updateOne(
      { tokenHash: this.tokens.hash(rawRefresh) },
      { revokedAt: new Date() },
    );
  }

  /** Absolute logout (§47.5): bump tokenVersion → every access token dies now. */
  async logoutAll(userId: string): Promise<void> {
    await this.users.bumpTokenVersion(userId);
    await this.sessionModel.updateMany(
      { user: new Types.ObjectId(userId), revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
  }

  listSessions(userId: string) {
    return this.sessionModel
      .find({ user: new Types.ObjectId(userId), revokedAt: { $exists: false } })
      .select('userAgent ip createdAt lastUsedAt expiresAt')
      .sort({ lastUsedAt: -1 })
      .lean()
      .exec();
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId, user: new Types.ObjectId(userId) },
      { revokedAt: new Date() },
    );
  }
}
