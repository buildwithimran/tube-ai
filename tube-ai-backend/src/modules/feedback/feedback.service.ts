import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from '../../schemas/feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
  ) {}

  create(userId: string | undefined, category: string, message: string) {
    return this.feedbackModel.create({
      user: userId ? new Types.ObjectId(userId) : undefined,
      category,
      message,
    });
  }

  list(status?: string) {
    const query = status ? { status } : {};
    return this.feedbackModel
      .find(query)
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async setStatus(id: string, status: string): Promise<void> {
    await this.feedbackModel.updateOne({ _id: id }, { status }).exec();
  }
}
