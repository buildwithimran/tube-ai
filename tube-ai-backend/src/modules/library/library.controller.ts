import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { LibraryService } from './library.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

class SaveDto {
  @IsString()
  generatedId: string;
}

@Controller({ path: 'library', version: '1' })
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('type') type?: string) {
    return this.library.list(user.userId, type);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser) {
    return this.library.recent(user.userId);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.library.history(user.userId);
  }

  @Post()
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveDto) {
    return this.library.save(user.userId, dto.generatedId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.library.get(user.userId, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.library.remove(user.userId, id);
    return { ok: true };
  }
}
