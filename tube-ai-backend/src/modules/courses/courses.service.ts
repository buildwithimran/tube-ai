import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from '../../schemas/course.schema';
import { YoutubeService } from '../youtube/youtube.service';

const MAX_LESSONS = 50;

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    private readonly youtube: YoutubeService,
  ) {}

  async createFromPlaylist(userId: string, playlistUrl: string) {
    const meta = await this.youtube.getPlaylistFromUrl(playlistUrl);
    if (!meta.videos.length) {
      throw new BadRequestException('That playlist has no videos (it may be private).');
    }
    const lessons = meta.videos.slice(0, MAX_LESSONS).map((v, i) => ({
      youtubeId: v.youtubeId,
      title: v.title,
      durationText: v.durationText,
      order: i,
      completed: false,
    }));
    return this.courseModel.create({
      user: new Types.ObjectId(userId),
      playlistId: meta.playlistId,
      title: meta.title,
      lessons,
    });
  }

  list(userId: string) {
    return this.courseModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async get(userId: string, id: string) {
    const course = await this.courseModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async setLessonComplete(
    userId: string,
    id: string,
    order: number,
    completed: boolean,
  ): Promise<void> {
    await this.courseModel
      .updateOne(
        { _id: id, user: new Types.ObjectId(userId), 'lessons.order': order },
        { $set: { 'lessons.$.completed': completed } },
      )
      .exec();
  }
}
