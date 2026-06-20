import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AppConfig } from '../../config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get tx(): Transporter | null {
    const s = this.config.get('smtp', { infer: true });
    if (!s.host || !s.user) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: s.host,
        port: s.port,
        secure: s.port === 465,
        auth: { user: s.user, pass: s.pass },
      });
    }
    return this.transporter;
  }

  async sendOtp(email: string, code: string, name?: string): Promise<void> {
    const s = this.config.get('smtp', { infer: true });
    const tx = this.tx;
    // Dev fallback: if SMTP isn't configured, log the code so flow is testable.
    if (!tx) {
      this.logger.warn(`[MAIL DISABLED] OTP for ${email} = ${code}`);
      return;
    }
    try {
      await tx.sendMail({
        from: s.from,
        to: email,
        subject: 'Your TubeAi verification code',
        html: this.otpHtml(code, name),
        text: `Your TubeAi verification code is ${code}. It expires in 10 minutes.`,
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${email}`, err as Error);
      this.logger.warn(`[MAIL FALLBACK] OTP for ${email} = ${code}`);
    }
  }

  async sendPasswordReset(
    email: string,
    code: string,
    name?: string,
  ): Promise<void> {
    const s = this.config.get('smtp', { infer: true });
    const tx = this.tx;
    if (!tx) {
      this.logger.warn(`[MAIL DISABLED] Password reset code for ${email} = ${code}`);
      return;
    }
    try {
      await tx.sendMail({
        from: s.from,
        to: email,
        subject: 'Reset your TubeAi password',
        html: this.resetHtml(code, name),
        text: `Your TubeAi password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      });
    } catch (err) {
      this.logger.error(`Failed to send reset code to ${email}`, err as Error);
      this.logger.warn(`[MAIL FALLBACK] Password reset code for ${email} = ${code}`);
    }
  }

  private resetHtml(code: string, name?: string): string {
    return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0a0a0b;color:#e5e5e5;padding:32px;border-radius:16px;max-width:440px;margin:auto">
    <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#6366f1,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent">TubeAi</div>
    <h1 style="font-size:20px;margin:20px 0 8px">Reset your password${name ? `, ${name}` : ''}</h1>
    <p style="color:#a3a3a3;font-size:14px;margin:0 0 20px">Enter this code to set a new password:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#141417;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px 0">${code}</div>
    <p style="color:#737373;font-size:12px;margin:20px 0 0">This code expires in 10 minutes. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>
  </div>`;
  }

  private otpHtml(code: string, name?: string): string {
    return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0a0a0b;color:#e5e5e5;padding:32px;border-radius:16px;max-width:440px;margin:auto">
    <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#6366f1,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent">TubeAi</div>
    <h1 style="font-size:20px;margin:20px 0 8px">Verify your email${name ? `, ${name}` : ''}</h1>
    <p style="color:#a3a3a3;font-size:14px;margin:0 0 20px">Enter this code to finish signing up:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#141417;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px 0">${code}</div>
    <p style="color:#737373;font-size:12px;margin:20px 0 0">This code expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>
  </div>`;
  }
}
