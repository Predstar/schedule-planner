import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import type { ListSwapsQueryDto } from './dto/list-swaps-query.dto';
import type { SwapRequestResponseDto } from './dto/swap-request-response.dto';

type SwapRequestRecord = {
  id: string;
  requestingEmployeeId: string;
  targetEmployeeId: string;
  requestingAssignmentId: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED';
  createdAt: Date;
  requestingEmployee: { firstName: string; lastName: string };
  targetEmployee: { firstName: string; lastName: string };
  requestingAssignment: { shift: { date: Date; startTime: string; endTime: string } };
};

const SWAP_INCLUDE = {
  requestingEmployee: { select: { firstName: true, lastName: true } },
  targetEmployee: { select: { firstName: true, lastName: true } },
  requestingAssignment: { include: { shift: true } },
} as const;

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

function mapSwapRequest(raw: unknown): SwapRequestResponseDto {
  const swap = raw as SwapRequestRecord;
  return {
    id: swap.id,
    requestingEmployeeId: swap.requestingEmployeeId,
    requestingEmployeeName: `${swap.requestingEmployee.firstName} ${swap.requestingEmployee.lastName}`.trim(),
    targetEmployeeId: swap.targetEmployeeId,
    targetEmployeeName: `${swap.targetEmployee.firstName} ${swap.targetEmployee.lastName}`.trim(),
    requestingShiftId: swap.requestingAssignmentId,
    requestingShiftDate: formatIsoDate(swap.requestingAssignment.shift.date),
    requestingShiftStart: swap.requestingAssignment.shift.startTime,
    requestingShiftEnd: swap.requestingAssignment.shift.endTime,
    reason: swap.reason,
    status: swap.status,
    createdAt: swap.createdAt.toISOString(),
  };
}

@Injectable()
export class SwapsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifySwapParties(employeeIds: string[], approved: boolean): Promise<void> {
    const users = await this.prismaService.user.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { id: true },
    });
    await this.notificationsService.notifySwapDecision(users.map((u) => u.id), approved);
  }

  async createSwapRequest(
    dto: CreateSwapRequestDto,
    authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only employees can create swap requests');
    }

    const assignment = await this.prismaService.scheduleAssignment.findUnique({
      where: { id: dto.requestingShiftId },
      include: { shift: true },
    });

    if (!assignment) {
      throw new AppException(404, 'ASSIGNMENT_NOT_FOUND', 'Shift assignment not found');
    }

    if (assignment.employeeId !== authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'You can only request a swap for your own shift');
    }

    if (dto.targetEmployeeId === authUser.employeeId) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Cannot request a swap with yourself', [
        { field: 'targetEmployeeId', message: 'Target employee must differ from the requester' },
      ]);
    }

    const targetEmployee = await this.prismaService.employee.findUnique({
      where: { id: dto.targetEmployeeId },
    });

    if (!targetEmployee || !targetEmployee.active) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Target employee not found');
    }

    if (targetEmployee.employeeRole !== assignment.shift.employeeRole) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Target employee role does not match the shift', [
        { field: 'targetEmployeeId', message: 'Target employee must have the same role as the shift' },
      ]);
    }

    const existingActiveSwap = await this.prismaService.swapRequest.findFirst({
      where: {
        requestingAssignmentId: dto.requestingShiftId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (existingActiveSwap) {
      throw new AppException(409, 'SWAP_ALREADY_EXISTS', 'A swap request for this shift is already in progress');
    }

    const created = await this.prismaService.swapRequest.create({
      data: {
        requestingEmployeeId: authUser.employeeId,
        targetEmployeeId: dto.targetEmployeeId,
        requestingAssignmentId: dto.requestingShiftId,
        reason: dto.reason,
        status: 'PENDING',
      },
      include: SWAP_INCLUDE,
    });

    return mapSwapRequest(created);
  }

  async getMySwapRequests(authUser: AuthUserPayload): Promise<SwapRequestResponseDto[]> {
    if (!authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'No employee account linked to this login');
    }

    const swaps = await this.prismaService.swapRequest.findMany({
      where: {
        OR: [
          { requestingEmployeeId: authUser.employeeId },
          { targetEmployeeId: authUser.employeeId },
        ],
      },
      include: SWAP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return swaps.map(mapSwapRequest);
  }

  async listSwapRequests(query: ListSwapsQueryDto): Promise<SwapRequestResponseDto[]> {
    const swaps = await this.prismaService.swapRequest.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: SWAP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return swaps.map(mapSwapRequest);
  }

  async acceptSwapRequest(
    swapId: string,
    authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    const swap = await this.getSwapById(swapId);

    if (swap.targetEmployeeId !== authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only the target employee can accept this swap request');
    }

    if (swap.status !== 'PENDING') {
      throw new AppException(409, 'SWAP_INVALID_STATE', `Cannot accept a swap request in status ${swap.status}`);
    }

    const updated = await this.prismaService.swapRequest.update({
      where: { id: swapId },
      data: { status: 'ACCEPTED' },
      include: SWAP_INCLUDE,
    });

    return mapSwapRequest(updated);
  }

  async declineSwapRequest(
    swapId: string,
    authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    const swap = await this.getSwapById(swapId);

    if (swap.targetEmployeeId !== authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Only the target employee can decline this swap request');
    }

    if (swap.status !== 'PENDING') {
      throw new AppException(409, 'SWAP_INVALID_STATE', `Cannot decline a swap request in status ${swap.status}`);
    }

    const updated = await this.prismaService.swapRequest.update({
      where: { id: swapId },
      data: { status: 'REJECTED' },
      include: SWAP_INCLUDE,
    });

    return mapSwapRequest(updated);
  }

  async approveSwapRequest(swapId: string): Promise<SwapRequestResponseDto> {
    const swap = await this.getSwapById(swapId);

    if (swap.status !== 'ACCEPTED') {
      throw new AppException(409, 'SWAP_INVALID_STATE', `Cannot approve a swap request in status ${swap.status}`);
    }

    const updated = await this.prismaService.$transaction(async (tx) => {
      await tx.scheduleAssignment.update({
        where: { id: swap.requestingAssignmentId },
        data: { employeeId: swap.targetEmployeeId },
      });

      return tx.swapRequest.update({
        where: { id: swapId },
        data: { status: 'APPROVED' },
        include: SWAP_INCLUDE,
      });
    });

    await this.notifySwapParties([swap.requestingEmployeeId, swap.targetEmployeeId], true);

    return mapSwapRequest(updated);
  }

  async rejectSwapRequest(swapId: string): Promise<SwapRequestResponseDto> {
    const swap = await this.getSwapById(swapId);

    if (swap.status !== 'ACCEPTED') {
      throw new AppException(409, 'SWAP_INVALID_STATE', `Cannot reject a swap request in status ${swap.status}`);
    }

    const updated = await this.prismaService.swapRequest.update({
      where: { id: swapId },
      data: { status: 'REJECTED' },
      include: SWAP_INCLUDE,
    });

    await this.notifySwapParties([swap.requestingEmployeeId, swap.targetEmployeeId], false);

    return mapSwapRequest(updated);
  }

  private async getSwapById(swapId: string) {
    const swap = await this.prismaService.swapRequest.findUnique({ where: { id: swapId } });

    if (!swap) {
      throw new AppException(404, 'SWAP_NOT_FOUND', 'Swap request not found');
    }

    return swap;
  }
}
