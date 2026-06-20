import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from '../../schemas/plan.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { UsersModule } from '../users/users.module';
import { UsageModule } from '../usage/usage.module';
import { PlansService } from './plans.service';
import { EntitlementsService } from './entitlements.service';
import { PlansController } from './plans.controller';
import { UsageLimitGuard } from '../../common/guards/usage-limit.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    UsersModule,
    UsageModule,
  ],
  controllers: [PlansController],
  providers: [
    PlansService,
    EntitlementsService,
    UsageLimitGuard,
    FeatureGuard,
  ],
  // Exported so feature modules can @UseGuards(UsageLimitGuard/FeatureGuard).
  exports: [
    PlansService,
    EntitlementsService,
    UsageLimitGuard,
    FeatureGuard,
    UsageModule,
  ],
})
export class PlansModule {}
