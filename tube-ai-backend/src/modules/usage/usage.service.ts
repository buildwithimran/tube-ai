import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsageLog, UsageLogDocument } from '../../schemas/usage-log.schema';

interface LogEntry {
  user: string;
  action: 'extract' | 'generate';
  video?: string;
  contentType?: string;
  tokensUsed?: number;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(UsageLog.name)
    private readonly usageModel: Model<UsageLogDocument>,
  ) {}

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  countToday(userId: string, action: 'extract' | 'generate'): Promise<number> {
    return this.usageModel
      .countDocuments({
        user: new Types.ObjectId(userId),
        action,
        createdAt: { $gte: this.startOfToday() },
      })
      .exec();
  }

  log(entry: LogEntry): Promise<UsageLogDocument> {
    return this.usageModel.create({
      user: new Types.ObjectId(entry.user),
      action: entry.action,
      video: entry.video ? new Types.ObjectId(entry.video) : undefined,
      contentType: entry.contentType,
      tokensUsed: entry.tokensUsed ?? 0,
    });
  }
}
