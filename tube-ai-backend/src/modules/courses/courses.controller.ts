import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsString } from 'class-validator';
import { CoursesService } from './courses.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class CreateCourseDto {
  @IsString()
  playlistUrl: string;
}
class LessonCompleteDto {
  @IsBoolean()
  completed: boolean;
}

// NOTE: Playlist→Course is the Pro flagship. Gate with @RequiresFeature('playlist')
// + FeatureGuard before launch; left open here for testing.
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.courses.createFromPlaylist(user.userId, dto.playlistUrl);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.courses.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.courses.get(user.userId, id);
  }

  @Patch(':id/lessons/:order')
  async setComplete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('order', ParseIntPipe) order: number,
    @Body() dto: LessonCompleteDto,
  ) {
    await this.courses.setLessonComplete(user.userId, id, order, dto.completed);
    return { ok: true };
  }
}
