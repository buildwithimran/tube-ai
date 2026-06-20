import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageLog, UsageLogSchema } from '../../schemas/usage-log.schema';
import { UsageService } from './usage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageLog.name, schema: UsageLogSchema },
    ]),
  ],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
