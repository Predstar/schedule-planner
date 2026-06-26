import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { ShiftsService } from '../shifts.service';

describe('ShiftsService', () => {
  const prismaService = {
    shift: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as any;

  let shiftsService: ShiftsService;

  beforeEach(() => {
    vi.clearAllMocks();
    shiftsService = new ShiftsService(prismaService);
  });

  it('creates a shift', async () => {
    prismaService.shift.create = vi.fn().mockResolvedValue({
      id: 'shift-1',
      date: new Date('2026-04-06T00:00:00.000Z'),
      startTime: '17:00',
      endTime: '23:00',
      employeeRole: 'WAITER',
      requiredCount: 4,
    });

    await expect(
      shiftsService.createShift({
        date: '2026-04-06',
        startTime: '17:00',
        endTime: '23:00',
        employeeRole: 'WAITER',
        requiredCount: 4,
      }),
    ).resolves.toEqual({
      id: 'shift-1',
      date: '2026-04-06',
      startTime: '17:00',
      endTime: '23:00',
      employeeRole: 'WAITER',
      requiredCount: 4,
    });
  });

  it('lists shifts for an inclusive date range', async () => {
    prismaService.shift.findMany = vi.fn().mockResolvedValue([
      {
        id: 'shift-1',
        date: new Date('2026-04-06T00:00:00.000Z'),
        startTime: '17:00',
        endTime: '23:00',
        employeeRole: 'WAITER',
        requiredCount: 4,
      },
      {
        id: 'shift-2',
        date: new Date('2026-04-12T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '14:00',
        employeeRole: 'RUNNER',
        requiredCount: 2,
      },
    ]);

    await expect(
      shiftsService.listShifts({ from: '2026-04-06', to: '2026-04-12' }),
    ).resolves.toEqual([
      {
        id: 'shift-1',
        date: '2026-04-06',
        startTime: '17:00',
        endTime: '23:00',
        employeeRole: 'WAITER',
        requiredCount: 4,
      },
      {
        id: 'shift-2',
        date: '2026-04-12',
        startTime: '10:00',
        endTime: '14:00',
        employeeRole: 'RUNNER',
        requiredCount: 2,
      },
    ]);

    expect(prismaService.shift.findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2026-04-06T00:00:00.000Z'),
          lte: new Date('2026-04-12T00:00:00.000Z'),
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  });

  it('updates a shift', async () => {
    prismaService.shift.findUnique = vi.fn().mockResolvedValue({ id: 'shift-1' });
    prismaService.shift.update = vi.fn().mockResolvedValue({
      id: 'shift-1',
      date: new Date('2026-04-07T00:00:00.000Z'),
      startTime: '18:00',
      endTime: '22:00',
      employeeRole: 'BARTENDER',
      requiredCount: 1,
    });

    await expect(
      shiftsService.updateShift('shift-1', {
        date: '2026-04-07',
        startTime: '18:00',
        endTime: '22:00',
        employeeRole: 'BARTENDER',
        requiredCount: 1,
      }),
    ).resolves.toEqual({
      id: 'shift-1',
      date: '2026-04-07',
      startTime: '18:00',
      endTime: '22:00',
      employeeRole: 'BARTENDER',
      requiredCount: 1,
    });
  });

  it('returns 404 SHIFT_NOT_FOUND on missing update target', async () => {
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(null);

    try {
      await shiftsService.updateShift('missing-shift', {
        date: '2026-04-07',
        startTime: '18:00',
        endTime: '22:00',
        employeeRole: 'BARTENDER',
        requiredCount: 1,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('SHIFT_NOT_FOUND');
      return;
    }

    throw new Error('Expected SHIFT_NOT_FOUND');
  });

  it('deletes a shift', async () => {
    prismaService.shift.findUnique = vi.fn().mockResolvedValue({ id: 'shift-1' });
    prismaService.shift.delete = vi.fn().mockResolvedValue(undefined);

    await expect(shiftsService.deleteShift('shift-1')).resolves.toBeUndefined();
    expect(prismaService.shift.delete).toHaveBeenCalledWith({
      where: { id: 'shift-1' },
    });
  });

  it('returns 404 SHIFT_NOT_FOUND on missing delete target', async () => {
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(null);

    try {
      await shiftsService.deleteShift('missing-shift');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('SHIFT_NOT_FOUND');
      return;
    }

    throw new Error('Expected SHIFT_NOT_FOUND');
  });
});
