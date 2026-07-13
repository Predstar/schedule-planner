import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { BERLIN_TIMEZONE } from '../availability/availability.constants';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { MailService } from '../auth/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationResponseDto } from './dto/notification-response.dto';

const REMINDER_WINDOW_HOURS = 24;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getMyNotifications(authUser: AuthUserPayload): Promise<NotificationResponseDto[]> {
    const stored = await this.prismaService.notification.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const mapped: NotificationResponseDto[] = stored.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));

    const reminder = await this.computeAvailabilityReminder(authUser);
    return reminder ? [reminder, ...mapped] : mapped;
  }

  async markAsRead(notificationId: string, authUser: AuthUserPayload): Promise<void> {
    await this.prismaService.notification.updateMany({
      where: { id: notificationId, userId: authUser.id },
      data: { read: true },
    });
  }

  async clearAll(authUser: AuthUserPayload): Promise<void> {
    await this.prismaService.notification.deleteMany({
      where: { userId: authUser.id },
    });
  }

  // ── Event hooks (called by other services) ──────────────────────────────

  async notifyScheduleDraftGenerated(managerUserIds: string[], weekStartDate: string): Promise<void> {
    await this.createForUsers(
      managerUserIds,
      'SCHEDULE_DRAFT_GENERATED',
      `A draft schedule for the week of ${weekStartDate} was auto-generated and is ready for review.`,
    );
  }

  async notifySchedulePublished(employeeUserIds: string[], weekStartDate: string): Promise<void> {
    await this.createForUsers(
      employeeUserIds,
      'SCHEDULE_PUBLISHED',
      `The schedule for the week of ${weekStartDate} has been published. Check your shifts.`,
    );
  }

  async notifySwapDecision(userIds: string[], approved: boolean): Promise<void> {
    await this.createForUsers(
      userIds,
      'SWAP_DECISION',
      approved
        ? 'Your shift swap request was approved by your manager.'
        : 'Your shift swap request was rejected by your manager.',
    );
  }

  async notifyShiftClaimDecision(userIds: string[], approved: boolean): Promise<void> {
    await this.createForUsers(
      userIds,
      'SHIFT_CLAIM_DECISION',
      approved
        ? 'A shift claim you were involved in was approved by your manager.'
        : 'A shift claim you were involved in was rejected by your manager.',
    );
  }

  private async createForUsers(
    userIds: string[],
    type: 'SCHEDULE_DRAFT_GENERATED' | 'SCHEDULE_PUBLISHED' | 'SWAP_DECISION' | 'SHIFT_CLAIM_DECISION',
    message: string,
  ): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds));
    if (uniqueUserIds.length === 0) return;

    await this.prismaService.notification.createMany({
      data: uniqueUserIds.map((userId) => ({ userId, type, message })),
    });

    const users = await this.prismaService.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { email: true },
    });

    await Promise.all(
      users.map((u) => this.mailService.sendNotificationEmail(u.email, 'Authentikka notification', message)),
    );
  }

  private async computeAvailabilityReminder(
    authUser: AuthUserPayload,
  ): Promise<NotificationResponseDto | null> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      return null;
    }

    const now = DateTime.now().setZone(BERLIN_TIMEZONE);
    const nextMonday = now.startOf('week').plus({ weeks: now.weekday === 1 ? 0 : 1 });
    const weekStartDate = nextMonday.toISODate() as string;
    const deadline = nextMonday.minus({ days: 2 });
    const hoursUntilDeadline = deadline.diff(now, 'hours').hours;

    if (hoursUntilDeadline <= 0 || hoursUntilDeadline > REMINDER_WINDOW_HOURS) {
      return null;
    }

    const existing = await this.prismaService.availability.findUnique({
      where: {
        employeeId_weekStartDate: {
          employeeId: authUser.employeeId,
          weekStartDate: nextMonday.toJSDate(),
        },
      },
    });

    if (existing?.status === 'SUBMITTED') {
      return null;
    }

    return {
      id: `availability-reminder-${weekStartDate}`,
      type: 'AVAILABILITY_REMINDER',
      message: `Reminder: submit your availability for the week of ${weekStartDate} before the deadline.`,
      read: false,
      createdAt: now.toISO() as string,
    };
  }
}
