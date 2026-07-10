import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { SwapsService } from '../swaps.service';

function assignment(overrides: Partial<any> = {}) {
  return {
    id: 'assignment-1',
    scheduleId: 'schedule-1',
    shiftId: 'shift-1',
    employeeId: 'employee-1',
    shift: {
      id: 'shift-1',
      date: new Date('2026-07-20T00:00:00.000Z'),
      startTime: '10:00',
      endTime: '17:00',
      employeeRole: 'WAITER',
    },
    ...overrides,
  };
}

function employee(overrides: Partial<any> = {}) {
  return {
    id: 'employee-2',
    employeeRole: 'WAITER',
    active: true,
    ...overrides,
  };
}

function swap(overrides: Partial<any> = {}) {
  return {
    id: 'swap-1',
    requestingEmployeeId: 'employee-1',
    targetEmployeeId: 'employee-2',
    requestingAssignmentId: 'assignment-1',
    reason: 'Doctor appointment',
    status: 'PENDING',
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    requestingEmployee: { firstName: 'A', lastName: 'One' },
    targetEmployee: { firstName: 'B', lastName: 'Two' },
    requestingAssignment: { shift: { date: new Date('2026-07-20T00:00:00.000Z'), startTime: '10:00', endTime: '17:00' } },
    ...overrides,
  };
}

describe('SwapsService', () => {
  const prismaService = {
    scheduleAssignment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
    swapRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;

  let service: SwapsService;
  const authUser = { id: 'user-1', email: 'a@b.com', systemRole: 'EMPLOYEE', employeeId: 'employee-1' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SwapsService(prismaService);
  });

  describe('createSwapRequest', () => {
    it('creates a swap when requester owns the assignment and target role matches', async () => {
      prismaService.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prismaService.employee.findUnique.mockResolvedValue(employee());
      prismaService.swapRequest.findFirst.mockResolvedValue(null);
      prismaService.swapRequest.create.mockResolvedValue(swap());

      const result = await service.createSwapRequest(
        { targetEmployeeId: 'employee-2', requestingShiftId: 'assignment-1', reason: 'Doctor appointment' },
        authUser,
      );

      expect(result.status).toBe('PENDING');
      expect(prismaService.swapRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestingEmployeeId: 'employee-1',
            targetEmployeeId: 'employee-2',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('rejects when the requester does not own the assignment', async () => {
      prismaService.scheduleAssignment.findUnique.mockResolvedValue(assignment({ employeeId: 'someone-else' }));

      await expect(
        service.createSwapRequest(
          { targetEmployeeId: 'employee-2', requestingShiftId: 'assignment-1', reason: 'x' },
          authUser,
        ),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED' } satisfies Partial<AppException>);
    });

    it('rejects when target employee role does not match the shift role', async () => {
      prismaService.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prismaService.employee.findUnique.mockResolvedValue(employee({ employeeRole: 'RUNNER' }));

      await expect(
        service.createSwapRequest(
          { targetEmployeeId: 'employee-2', requestingShiftId: 'assignment-1', reason: 'x' },
          authUser,
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('rejects when a swap is already in progress for the assignment', async () => {
      prismaService.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prismaService.employee.findUnique.mockResolvedValue(employee());
      prismaService.swapRequest.findFirst.mockResolvedValue(swap());

      await expect(
        service.createSwapRequest(
          { targetEmployeeId: 'employee-2', requestingShiftId: 'assignment-1', reason: 'x' },
          authUser,
        ),
      ).rejects.toMatchObject({ code: 'SWAP_ALREADY_EXISTS' });
    });
  });

  describe('acceptSwapRequest / declineSwapRequest', () => {
    it('lets the target employee accept a pending swap', async () => {
      prismaService.swapRequest.findUnique.mockResolvedValue(swap());
      prismaService.swapRequest.update.mockResolvedValue(swap({ status: 'ACCEPTED' }));

      const result = await service.acceptSwapRequest('swap-1', { ...authUser, employeeId: 'employee-2' });
      expect(result.status).toBe('ACCEPTED');
    });

    it('denies accept from someone who is not the target', async () => {
      prismaService.swapRequest.findUnique.mockResolvedValue(swap());

      await expect(
        service.acceptSwapRequest('swap-1', authUser),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    });

    it('rejects accept when swap is not PENDING', async () => {
      prismaService.swapRequest.findUnique.mockResolvedValue(swap({ status: 'APPROVED' }));

      await expect(
        service.acceptSwapRequest('swap-1', { ...authUser, employeeId: 'employee-2' }),
      ).rejects.toMatchObject({ code: 'SWAP_INVALID_STATE' });
    });
  });

  describe('approveSwapRequest', () => {
    it('reassigns the shift and marks the swap APPROVED', async () => {
      prismaService.swapRequest.findUnique.mockResolvedValue(swap({ status: 'ACCEPTED' }));
      prismaService.$transaction.mockImplementation(async (fn: any) =>
        fn({
          scheduleAssignment: { update: vi.fn() },
          swapRequest: { update: vi.fn().mockResolvedValue(swap({ status: 'APPROVED' })) },
        }),
      );

      const result = await service.approveSwapRequest('swap-1');
      expect(result.status).toBe('APPROVED');
    });

    it('rejects approve when swap is not ACCEPTED', async () => {
      prismaService.swapRequest.findUnique.mockResolvedValue(swap({ status: 'PENDING' }));

      await expect(service.approveSwapRequest('swap-1')).rejects.toMatchObject({ code: 'SWAP_INVALID_STATE' });
    });
  });
});
