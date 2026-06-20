import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_FEATURE } from '../decorators/entitlement.decorators';
import { EntitlementsService } from '../../modules/plans/entitlements.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { Entitlements } from '../../schemas/plan.schema';

/** Boolean feature gate (§20): @RequiresFeature('translation'), etc. */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<keyof Entitlements>(
      REQUIRES_FEATURE,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const ent = await this.entitlements.forUser(user.userId);

    if (ent[feature] === true) return true;
    throw new HttpException(
      {
        error: 'FeatureLocked',
        message: `Your plan doesn't include "${String(feature)}".`,
        feature,
        upgradeTo: 'pro',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
