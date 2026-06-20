import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Video, VideoDocument } from '../../schemas/video.schema';
import {
  GeneratedContent,
  GeneratedContentDocument,
} from '../../schemas/generated-content.schema';
import { UsageLog, UsageLogDocument } from '../../schemas/usage-log.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    @InjectModel(GeneratedContent.name)
    private readonly genModel: Model<GeneratedContentDocument>,
    @InjectModel(UsageLog.name)
    private readonly usageModel: Model<UsageLogDocument>,
  ) {}

  async metrics() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [users, videos, generations, extractsToday, generationsToday] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.videoModel.countDocuments(),
        this.genModel.countDocuments(),
        this.usageModel.countDocuments({
          action: 'extract',
          createdAt: { $gte: start },
        }),
        this.usageModel.countDocuments({
          action: 'generate',
          createdAt: { $gte: start },
        }),
      ]);
    return { users, videos, generations, extractsToday, generationsToday };
  }

  listUsers(limit = 100) {
    return this.userModel
      .find()
      .select('email name role planKey planStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  listVideos(limit = 100) {
    return this.videoModel.find().sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  async setUserPlan(userId: string, planKey: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { planKey, planStatus: 'active' })
      .exec();
  }
}
