import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../../schemas/notification.schema';

interface NewNotification {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  /** Called by other modules (e.g. "your pack is ready"). */
  create(userId: string, n: NewNotification) {
    return this.model.create({ user: new Types.ObjectId(userId), ...n });
  }

  list(userId: string) {
    return this.model
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  unreadCount(userId: string): Promise<number> {
    return this.model
      .countDocuments({ user: new Types.ObjectId(userId), read: false })
      .exec();
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.model
      .updateOne({ _id: id, user: new Types.ObjectId(userId) }, { read: true })
      .exec();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model
      .updateMany(
        { user: new Types.ObjectId(userId), read: false },
        { read: true },
      )
      .exec();
  }
}
