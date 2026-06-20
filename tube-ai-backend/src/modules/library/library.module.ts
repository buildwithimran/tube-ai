import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GeneratedContent,
  GeneratedContentSchema,
} from '../../schemas/generated-content.schema';
import { Favorite, FavoriteSchema } from '../../schemas/favorite.schema';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { FavoritesController } from './favorites.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GeneratedContent.name, schema: GeneratedContentSchema },
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
  ],
  controllers: [LibraryController, FavoritesController],
  providers: [LibraryService],
})
export class LibraryModule {}
