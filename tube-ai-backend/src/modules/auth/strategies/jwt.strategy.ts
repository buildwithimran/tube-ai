import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { AccessTokenPayload } from '../token.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import type { AppConfig } from '../../../config/configuration';
import { COOKIE_NAMES } from '../cookie.util';

/** Pull the access JWT from the httpOnly cookie (not the Authorization header). */
const cookieExtractor = (req: Request): string | null => {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[COOKIE_NAMES.ACCESS_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).secret,
    });
  }

  /**
   * Runs on every authenticated request. The tokenVersion comparison is what
   * makes "absolute logout" instant: bumping the user's version invalidates all
   * previously-issued access tokens here (§47.5).
   */
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Token revoked');
    }
    return {
      userId: user.id as string,
      email: user.email,
      role: user.role,
      plan: user.planKey,
    };
  }
}
