import { Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import type { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMine(@CurrentUser() authUser: AuthUserPayload): Promise<NotificationResponseDto[]> {
    return this.notificationsService.getMyNotifications(authUser);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<void> {
    return this.notificationsService.markAsRead(notificationId, authUser);
  }

  @Delete()
  clearAll(@CurrentUser() authUser: AuthUserPayload): Promise<void> {
    return this.notificationsService.clearAll(authUser);
  }
}
