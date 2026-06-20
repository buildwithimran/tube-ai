import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  GeneratedContent,
  GeneratedContentDocument,
} from '../../schemas/generated-content.schema';
import { Favorite, FavoriteDocument } from '../../schemas/favorite.schema';

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(GeneratedContent.name)
    private readonly genModel: Model<GeneratedContentDocument>,
    @InjectModel(Favorite.name)
    private readonly favModel: Model<FavoriteDocument>,
  ) {}

  // --- Favorites -----------------------------------------------------------

  async addFavorite(userId: string, videoId: string): Promise<void> {
    await this.favModel
      .updateOne(
        { user: new Types.ObjectId(userId), video: new Types.ObjectId(videoId) },
        { $setOnInsert: { user: new Types.ObjectId(userId), video: new Types.ObjectId(videoId) } },
        { upsert: true },
      )
      .exec();
  }

  async removeFavorite(userId: string, videoId: string): Promise<void> {
    await this.favModel
      .deleteOne({
        user: new Types.ObjectId(userId),
        video: new Types.ObjectId(videoId),
      })
      .exec();
  }

  async isFavorite(userId: string, videoId: string): Promise<boolean> {
    const f = await this.favModel.exists({
      user: new Types.ObjectId(userId),
      video: new Types.ObjectId(videoId),
    });
    return !!f;
  }

  listFavorites(userId: string) {
    return this.favModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('video', 'title channel thumbnailUrl youtubeId durationSec')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /** Mark a generated result as saved into the user's library. */
  async save(userId: string, generatedId: string) {
    const doc = await this.genModel.findOneAndUpdate(
      { _id: generatedId, user: new Types.ObjectId(userId) },
      { saved: true },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Generated content not found');
    return doc;
  }

  list(userId: string, type?: string) {
    const query: Record<string, unknown> = {
      user: new Types.ObjectId(userId),
      saved: true,
    };
    if (type) query.type = type;
    return this.genModel
      .find(query)
      .populate('video', 'title channel thumbnailUrl youtubeId durationSec')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
  }

  /** Full history — every video the user generated a pack for, newest first. */
  history(userId: string) {
    return this.genModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('video', 'title channel thumbnailUrl youtubeId durationSec')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  /** Recent activity for the dashboard (saved or not), newest first. */
  recent(userId: string) {
    return this.genModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('video', 'title channel thumbnailUrl youtubeId durationSec')
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean()
      .exec();
  }

  get(userId: string, id: string) {
    return this.genModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .populate('video', 'title channel thumbnailUrl youtubeId durationSec')
      .lean()
      .exec();
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.genModel
      .deleteOne({ _id: id, user: new Types.ObjectId(userId) })
      .exec();
  }
}
