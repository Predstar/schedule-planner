import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulesService } from '../schedules/schedules.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { CreateOpenShiftPostDto } from './dto/create-open-shift-post.dto';
import type { OpenShiftPostResponseDto } from './dto/open-shift-post-response.dto';

const POST_INCLUDE = {
  postedByEmployee: { select: { firstName: true, lastName: true } },
  assignment: { include: { shift: true } },
  claims: {
    include: {
      claimingEmployee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

type PostRecord = {
  id: string;
  assignmentId: string;
  postedByEmployeeId: string;
  reason: string;
  status: 'OPEN' | 'CLAIMED' | 'APPROVED' | 'CANCELLED';
  createdAt: Date;
  postedByEmployee: { firstName: string; lastName: string };
  assignment: { employeeId: string; shift: { date: Date; startTime: string; endTime: string; employeeRole: string } };
  claims: Array<{
    id: string;
    claimingEmployeeId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: Date;
    claimingEmployee: { firstName: string; lastName: string };
  }>;
};

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

function mapPost(raw: unknown): OpenShiftPostResponseDto {
  const post = raw as PostRecord;
  return {
    id: post.id,
    assignmentId: post.assignmentId,
    postedByEmployeeId: post.postedByEmployeeId,
    postedByEmployeeName: `${post.postedByEmployee.firstName} ${post.postedByEmployee.lastName}`.trim(),
    shiftDate: formatIsoDate(post.assignment.shift.date),
    shiftStartTime: post.assignment.shift.startTime,
    shiftEndTime: post.assignment.shift.endTime,
    employeeRole: post.assignment.shift.employeeRole,
    reason: post.reason,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    claims: post.claims.map((claim) => ({
      id: claim.id,
      claimingEmployeeId: claim.claimingEmployeeId,
      claimingEmployeeName: `${claim.claimingEmployee.firstName} ${claim.claimingEmployee.lastName}`.trim(),
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
    })),
  };
}

@Injectable()
export class OpenShiftSwapsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly schedulesService: SchedulesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyClaimParties(employeeIds: string[], approved: boolean): Promise<void> {
    const users = await this.prismaService.user.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true },
    });
    await this.notificationsService.notifyShiftClaimDecision(users.map((u) => u.id), approved);
  }

  async createPost(
    dto: CreateOpenShiftPostDto,
    authUser: AuthUserPayload,
  ): Promise<OpenShiftPostResponseDto> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only employees can post an open shift');
    }

    const assignment = await this.prismaService.scheduleAssignment.findUnique({
      where: { id: dto.assignmentId },
    });

    if (!assignment) {
      throw new AppException(404, 'ASSIGNMENT_NOT_FOUND', 'Shift assignment not found');
    }

    if (assignment.employeeId !== authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'You can only post your own shift as open');
    }

    const existingActivePost = await this.prismaService.openShiftPost.findFirst({
      where: {
        assignmentId: dto.assignmentId,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
    });

    if (existingActivePost) {
      throw new AppException(409, 'OPEN_SHIFT_POST_ALREADY_EXISTS', 'This shift is already posted as open');
    }

    const created = await this.prismaService.openShiftPost.create({
      data: {
        assignmentId: dto.assignmentId,
        postedByEmployeeId: authUser.employeeId,
        reason: dto.reason,
        status: 'OPEN',
      },
      include: POST_INCLUDE,
    });

    return mapPost(created);
  }

  async listOpenPosts(authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto[]> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only employees can browse open shifts');
    }

    const employee = await this.prismaService.employee.findUnique({
      where: { id: authUser.employeeId },
    });

    if (!employee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const posts = await this.prismaService.openShiftPost.findMany({
      where: {
        status: 'OPEN',
        postedByEmployeeId: { not: authUser.employeeId },
        assignment: { shift: { employeeRole: employee.employeeRole } },
      },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(mapPost);
  }

  async getMyPosts(authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto[]> {
    if (!authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'No employee account linked to this login');
    }

    const posts = await this.prismaService.openShiftPost.findMany({
      where: {
        OR: [
          { postedByEmployeeId: authUser.employeeId },
          { claims: { some: { claimingEmployeeId: authUser.employeeId } } },
        ],
      },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(mapPost);
  }

  async listAllForManager(): Promise<OpenShiftPostResponseDto[]> {
    const posts = await this.prismaService.openShiftPost.findMany({
      where: { status: { in: ['OPEN', 'CLAIMED'] } },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map(mapPost);
  }

  async claimPost(postId: string, authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only employees can claim an open shift');
    }

    const post = await this.getPostById(postId);

    if (post.postedByEmployeeId === authUser.employeeId) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Cannot claim your own posted shift');
    }

    if (post.status !== 'OPEN') {
      throw new AppException(409, 'OPEN_SHIFT_POST_INVALID_STATE', `Cannot claim a post in status ${post.status}`);
    }

    const employee = await this.prismaService.employee.findUnique({
      where: { id: authUser.employeeId },
    });

    if (!employee || !employee.active) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    if (employee.employeeRole !== post.assignment.shift.employeeRole) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Your role does not match this shift');
    }

    const existingClaim = await this.prismaService.shiftClaim.findFirst({
      where: { openPostId: postId, claimingEmployeeId: authUser.employeeId },
    });

    if (existingClaim) {
      throw new AppException(409, 'CLAIM_ALREADY_EXISTS', 'You already claimed this shift');
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      await tx.shiftClaim.create({
        data: { openPostId: postId, claimingEmployeeId: authUser.employeeId! },
      });

      return tx.openShiftPost.update({
        where: { id: postId },
        data: { status: 'CLAIMED' },
        include: POST_INCLUDE,
      });
    });

    return mapPost(updated);
  }

  async approveClaim(postId: string, claimId: string): Promise<OpenShiftPostResponseDto> {
    const post = await this.getPostById(postId);
    const claim = post.claims.find((c) => c.id === claimId);

    if (!claim) {
      throw new AppException(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }

    if (post.status !== 'CLAIMED') {
      throw new AppException(409, 'OPEN_SHIFT_POST_INVALID_STATE', `Cannot approve a claim on a post in status ${post.status}`);
    }

    if (claim.status !== 'PENDING') {
      throw new AppException(409, 'CLAIM_INVALID_STATE', `Cannot approve a claim in status ${claim.status}`);
    }

    await this.schedulesService.transferAssignmentForClaim(post.assignmentId, claim.claimingEmployeeId);

    const updated = await this.prismaService.$transaction(async (tx) => {
      await tx.shiftClaim.update({
        where: { id: claimId },
        data: { status: 'APPROVED' },
      });

      await tx.shiftClaim.updateMany({
        where: { openPostId: postId, id: { not: claimId }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });

      return tx.openShiftPost.update({
        where: { id: postId },
        data: { status: 'APPROVED' },
        include: POST_INCLUDE,
      });
    });

    await this.notifyClaimParties([post.postedByEmployeeId, claim.claimingEmployeeId], true);

    return mapPost(updated);
  }

  async rejectClaim(postId: string, claimId: string): Promise<OpenShiftPostResponseDto> {
    const post = await this.getPostById(postId);
    const claim = post.claims.find((c) => c.id === claimId);

    if (!claim) {
      throw new AppException(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }

    if (claim.status !== 'PENDING') {
      throw new AppException(409, 'CLAIM_INVALID_STATE', `Cannot reject a claim in status ${claim.status}`);
    }

    const remainingPendingCount = post.claims.filter((c) => c.id !== claimId && c.status === 'PENDING').length;

    const updated = await this.prismaService.$transaction(async (tx) => {
      await tx.shiftClaim.update({
        where: { id: claimId },
        data: { status: 'REJECTED' },
      });

      if (remainingPendingCount === 0) {
        await tx.openShiftPost.update({
          where: { id: postId },
          data: { status: 'OPEN' },
        });
      }

      return tx.openShiftPost.findUniqueOrThrow({
        where: { id: postId },
        include: POST_INCLUDE,
      });
    });

    await this.notifyClaimParties([post.postedByEmployeeId, claim.claimingEmployeeId], false);

    return mapPost(updated);
  }

  async cancelPost(postId: string, authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto> {
    const post = await this.getPostById(postId);

    if (post.postedByEmployeeId !== authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only the posting employee can cancel this post');
    }

    if (post.status === 'APPROVED') {
      throw new AppException(409, 'OPEN_SHIFT_POST_INVALID_STATE', 'Cannot cancel an already-approved post');
    }

    const updated = await this.prismaService.openShiftPost.update({
      where: { id: postId },
      data: { status: 'CANCELLED' },
      include: POST_INCLUDE,
    });

    return mapPost(updated);
  }

  private async getPostById(postId: string): Promise<PostRecord> {
    const post = await this.prismaService.openShiftPost.findUnique({
      where: { id: postId },
      include: POST_INCLUDE,
    });

    if (!post) {
      throw new AppException(404, 'OPEN_SHIFT_POST_NOT_FOUND', 'Open shift post not found');
    }

    return post as unknown as PostRecord;
  }
}
