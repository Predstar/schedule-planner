import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftsController } from '../shifts.controller';
import { ShiftsService } from '../shifts.service';

describe('ShiftsController', () => {
  const shiftsService = {
    createShift: vi.fn(),
    listShifts: vi.fn(),
    updateShift: vi.fn(),
    deleteShift: vi.fn(),
  } as unknown as ShiftsService;

  let controller: ShiftsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ShiftsController(shiftsService);
  });

  it('returns the shift response shape for create', async () => {
    shiftsService.createShift = vi.fn().mockResolvedValue({
      id: 'shift-1',
      date: '2026-04-06',
      startTime: '17:00',
      endTime: '23:00',
      employeeRole: 'WAITER',
      requiredCount: 4,
    });

    await expect(
      controller.create({
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

  it('passes the list query through', async () => {
    shiftsService.listShifts = vi.fn().mockResolvedValue([]);

    await controller.list({ from: '2026-04-06', to: '2026-04-12' });

    expect(shiftsService.listShifts).toHaveBeenCalledWith({
      from: '2026-04-06',
      to: '2026-04-12',
    });
  });

  it('passes update and delete through', async () => {
    shiftsService.updateShift = vi.fn().mockResolvedValue({
      id: 'shift-1',
      date: '2026-04-07',
      startTime: '18:00',
      endTime: '22:00',
      employeeRole: 'BARTENDER',
      requiredCount: 1,
    });
    shiftsService.deleteShift = vi.fn().mockResolvedValue(undefined);

    await controller.update('shift-1', {
      date: '2026-04-07',
      startTime: '18:00',
      endTime: '22:00',
      employeeRole: 'BARTENDER',
      requiredCount: 1,
    });
    await controller.remove('shift-1');

    expect(shiftsService.updateShift).toHaveBeenCalledWith('shift-1', {
      date: '2026-04-07',
      startTime: '18:00',
      endTime: '22:00',
      employeeRole: 'BARTENDER',
      requiredCount: 1,
    });
    expect(shiftsService.deleteShift).toHaveBeenCalledWith('shift-1');
  });
});
