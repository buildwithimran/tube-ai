import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { AppConfig } from '../../config/configuration';

/** Claims carried by the short-lived access JWT (§47.1). */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
  plan: string;
  tv: number; // tokenVersion — mismatch ⇒ token revoked (absolute logout)
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    const jwt = this.config.get('jwt', { infer: true });
    return this.jwt.sign(payload, {
      secret: jwt.secret,
      // accessTtl is a duration string like '15m'; ms() parses it at runtime.
      expiresIn: jwt.accessTtl as unknown as number,
    });
  }

  /** Opaque, high-entropy refresh token — NOT a JWT (stored hashed). */
  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  /** Refresh tokens are persisted as sha256 hashes — never plaintext. */
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  newFamilyId(): string {
    return randomBytes(16).toString('hex');
  }
}
