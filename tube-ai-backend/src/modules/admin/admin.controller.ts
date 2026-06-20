import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { AdminService } from './admin.service';
import { FeedbackService } from '../feedback/feedback.service';
import { PlansService } from '../plans/plans.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

class SetPlanDto {
  @IsString()
  planKey: string;
}

class SetFeedbackStatusDto {
  @IsIn(['open', 'resolved'])
  status: string;
}

@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly feedback: FeedbackService,
    private readonly plans: PlansService,
  ) {}

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Get('videos')
  videos() {
    return this.admin.listVideos();
  }

  @Patch('users/:id/plan')
  async setUserPlan(@Param('id') id: string, @Body() dto: SetPlanDto) {
    await this.admin.setUserPlan(id, dto.planKey);
    return { ok: true };
  }

  @Get('plans')
  listPlans() {
    return this.plans.listActive();
  }

  @Get('feedback')
  listFeedback(@Query('status') status?: string) {
    return this.feedback.list(status);
  }

  @Patch('feedback/:id')
  async setFeedbackStatus(
    @Param('id') id: string,
    @Body() dto: SetFeedbackStatusDto,
  ) {
    await this.feedback.setStatus(id, dto.status);
    return { ok: true };
  }
}
