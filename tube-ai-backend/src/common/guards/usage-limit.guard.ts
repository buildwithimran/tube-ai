import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  USAGE_ACTION,
  UsageActionType,
} from '../decorators/entitlement.decorators';
import { EntitlementsService } from '../../modules/plans/entitlements.service';
import { UsageService } from '../../modules/usage/usage.service';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Daily-quota gate (§20). Reads @UsageAction('extract'|'generate'), resolves the
 * user's plan entitlements, counts today's usage, and blocks with 402 + upgrade
 * payload when the cap is hit. -1 entitlement = unlimited.
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<UsageActionType>(
      USAGE_ACTION,
      [context.getHandler(), context.getClass()],
    );
    if (!action) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const ent = await this.entitlements.forUser(user.userId);

    const limit =
      action === 'extract' ? ent.videosPerDay : ent.generationsPerDay;
    if (this.entitlements.isUnlimited(limit)) return true;

    const used = await this.usage.countToday(user.userId, action);
    if (used >= limit) {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      throw new HttpException(
        {
          error: 'PlanLimitReached',
          message: `Daily ${action} limit reached on your plan.`,
          used,
          limit,
          remaining: 0,
          resetAt: tomorrow.toISOString(),
          upgradeTo: 'pro',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }
}
