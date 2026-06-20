import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../schemas/user.schema';
import { Video, VideoSchema } from '../../schemas/video.schema';
import {
  GeneratedContent,
  GeneratedContentSchema,
} from '../../schemas/generated-content.schema';
import { UsageLog, UsageLogSchema } from '../../schemas/usage-log.schema';
import { FeedbackModule } from '../feedback/feedback.module';
import { PlansModule } from '../plans/plans.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Video.name, schema: VideoSchema },
      { name: GeneratedContent.name, schema: GeneratedContentSchema },
      { name: UsageLog.name, schema: UsageLogSchema },
    ]),
    FeedbackModule,
    PlansModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
