import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { EntitlementsService } from './entitlements.service';
import { UsageService } from '../usage/usage.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

const remaining = (limit: number, used: number) =>
  limit === -1 ? -1 : Math.max(0, limit - used);

@Controller({ version: '1' })
export class PlansController {
  constructor(
    private readonly plans: PlansService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
  ) {}

  /** Public pricing page data. */
  @Public()
  @Get('plans')
  listPlans() {
    return this.plans.listActive();
  }

  /** What the current user is allowed to do. */
  @Get('me/entitlements')
  myEntitlements(@CurrentUser() user: AuthUser) {
    return this.entitlements.forUser(user.userId);
  }

  /** Usage meter data for the dashboard. */
  @Get('usage')
  async usageSummary(@CurrentUser() user: AuthUser) {
    const ent = await this.entitlements.forUser(user.userId);
    const [videosUsed, gensUsed] = await Promise.all([
      this.usage.countToday(user.userId, 'extract'),
      this.usage.countToday(user.userId, 'generate'),
    ]);
    return {
      videos: {
        used: videosUsed,
        limit: ent.videosPerDay,
        remaining: remaining(ent.videosPerDay, videosUsed),
      },
      generations: {
        used: gensUsed,
        limit: ent.generationsPerDay,
        remaining: remaining(ent.generationsPerDay, gensUsed),
      },
    };
  }

  /** STUB checkout (§20): records intent; real gateway wired later. */
  @Post('billing/checkout')
  async checkout(@Body() dto: CheckoutDto) {
    const plan = await this.plans.getByKey(dto.planKey);
    if (!plan) throw new NotFoundException('Unknown plan');
    return {
      status: 'stub',
      message:
        'Checkout is not yet connected to a payment provider. For now an admin can grant this plan.',
      planKey: dto.planKey,
      price: plan.price,
    };
  }
}
