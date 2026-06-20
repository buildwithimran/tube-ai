import { Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const [items, unread] = await Promise.all([
      this.notifications.list(user.userId),
      this.notifications.unreadCount(user.userId),
    ]);
    return { items, unread };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user.userId);
    return { ok: true };
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notifications.markRead(user.userId, id);
    return { ok: true };
  }
}
