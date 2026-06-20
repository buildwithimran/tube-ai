import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { RequestMeta } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  clearAuthCookies,
  COOKIE_NAMES,
  setAuthCookies,
} from './cookie.util';
import type { AppConfig } from '../../config/configuration';
import { UserDocument } from '../../schemas/user.schema';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private get isProd(): boolean {
    return this.config.get('env', { infer: true }) === 'production';
  }

  private meta(req: Request): RequestMeta {
    return { userAgent: req.headers['user-agent'], ip: req.ip };
  }

  private view(user: UserDocument) {
    return {
      id: user.id as string,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      planKey: user.planKey,
      planStatus: user.planStatus,
      emailVerified: user.emailVerified,
    };
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.register(dto);
    const tokens = await this.auth.startSession(user, this.meta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, this.isProd);
    // Fire the verification email; don't block signup if it fails.
    await this.auth.generateAndSendOtp(user).catch(() => undefined);
    return this.view(user);
  }

  @Post('verify-otp')
  async verifyOtp(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyOtpDto,
  ) {
    await this.auth.verifyOtp(user.userId, dto.code);
    const doc = await this.users.findById(user.userId);
    if (!doc) throw new UnauthorizedException();
    return this.view(doc);
  }

  @Post('resend-otp')
  async resendOtp(@CurrentUser() user: AuthUser) {
    const doc = await this.users.findById(user.userId);
    if (doc) await this.auth.generateAndSendOtp(doc);
    return { sent: true };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(dto.email);
    // Always the same response — never reveal whether the email is registered.
    return {
      ok: true,
      message: 'If an account exists for that email, a reset code is on its way.',
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.email, dto.code, dto.password);
    return { ok: true };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const tokens = await this.auth.startSession(user, this.meta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, this.isProd);
    return this.view(user);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = (req.cookies as Record<string, string>)?.[
      COOKIE_NAMES.REFRESH_COOKIE
    ];
    if (!raw) throw new UnauthorizedException('No refresh token');
    const tokens = await this.auth.rotate(raw, this.meta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, this.isProd);
    return { refreshed: true };
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = (req.cookies as Record<string, string>)?.[
      COOKIE_NAMES.REFRESH_COOKIE
    ];
    await this.auth.logout(raw);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutAll(user.userId);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const doc = await this.users.findById(user.userId);
    if (!doc) throw new UnauthorizedException();
    return this.view(doc);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user.userId);
  }

  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.auth.revokeSession(user.userId, id);
    return { ok: true };
  }
}
