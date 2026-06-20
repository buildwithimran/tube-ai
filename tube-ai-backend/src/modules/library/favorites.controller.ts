import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { LibraryService } from './library.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class FavoriteDto {
  @IsString()
  videoId: string;
}

@Controller({ path: 'favorites', version: '1' })
export class FavoritesController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.library.listFavorites(user.userId);
  }

  @Get('check/:videoId')
  async check(@CurrentUser() user: AuthUser, @Param('videoId') videoId: string) {
    return { favorite: await this.library.isFavorite(user.userId, videoId) };
  }

  @Post()
  async add(@CurrentUser() user: AuthUser, @Body() dto: FavoriteDto) {
    await this.library.addFavorite(user.userId, dto.videoId);
    return { favorite: true };
  }

  @Delete(':videoId')
  async remove(@CurrentUser() user: AuthUser, @Param('videoId') videoId: string) {
    await this.library.removeFavorite(user.userId, videoId);
    return { favorite: false };
  }
}
