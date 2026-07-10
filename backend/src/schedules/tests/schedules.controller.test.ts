import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulesController } from '../schedules.controller';
import { SchedulesService } from '../schedules.service';

describe('SchedulesController', () => {
  const schedulesService = {
    createDraftSchedule: vi.fn(),
    getWeeklySchedule: vi.fn(),
    getMyRolePublishedSchedule: vi.fn(),
    addAssignment: vi.fn(),
    removeAssignment: vi.fn(),
    replaceAssignment: vi.fn(),
    approveSchedule: vi.fn(),
    rejectSchedule: vi.fn(),
    publishSchedule: vi.fn(),
  } as unknown as SchedulesService;

  let controller: SchedulesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new SchedulesController(schedulesService);
  });

  it('delegates create and get', async () => {
    schedulesService.createDraftSchedule = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });
    schedulesService.getWeeklySchedule = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });

    await controller.create({ weekStartDate: '2026-04-06' });
    await controller.getWeeklySchedule({ weekStartDate: '2026-04-06' });

    expect(schedulesService.createDraftSchedule).toHaveBeenCalledWith({
      weekStartDate: '2026-04-06',
    });
    expect(schedulesService.getWeeklySchedule).toHaveBeenCalledWith({
      weekStartDate: '2026-04-06',
    });
  });

  it('delegates my-role query with auth user', async () => {
    schedulesService.getMyRolePublishedSchedule = vi.fn().mockResolvedValue({
      weekStartDate: '2026-04-06',
      employeeRole: 'WAITER',
      status: 'PUBLISHED',
      assignments: [],
    });

    const authUser = {
      id: 'user-1',
      email: 'waiter@restaurant.com',
      systemRole: 'EMPLOYEE' as const,
      employeeId: 'employee-1',
    };

    await controller.getMyRoleSchedule({ weekStartDate: '2026-04-06' }, authUser);

    expect(schedulesService.getMyRolePublishedSchedule).toHaveBeenCalledWith(
      { weekStartDate: '2026-04-06' },
      authUser,
    );
  });

  it('delegates add/remove/replace assignment', async () => {
    schedulesService.addAssignment = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });
    schedulesService.removeAssignment = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });
    schedulesService.replaceAssignment = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });

    await controller.addAssignment('schedule-1', {
      shiftId: 'shift-1',
      employeeId: 'employee-1',
    });
    await controller.removeAssignment('schedule-1', 'assignment-1');
    await controller.replaceAssignment('schedule-1', 'assignment-1', {
      employeeId: 'employee-2',
    });

    expect(schedulesService.addAssignment).toHaveBeenCalledWith('schedule-1', {
      shiftId: 'shift-1',
      employeeId: 'employee-1',
    });
    expect(schedulesService.removeAssignment).toHaveBeenCalledWith(
      'schedule-1',
      'assignment-1',
    );
    expect(schedulesService.replaceAssignment).toHaveBeenCalledWith(
      'schedule-1',
      'assignment-1',
      { employeeId: 'employee-2' },
    );
  });

  it('delegates approve/reject/publish', async () => {
    schedulesService.approveSchedule = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'APPROVED',
      assignments: [],
    });
    schedulesService.rejectSchedule = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'REJECTED',
      assignments: [],
    });
    schedulesService.publishSchedule = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'PUBLISHED',
      assignments: [],
    });

    await controller.approve('schedule-1');
    await controller.reject('schedule-1', { reason: 'Too many uncovered shifts.' });
    await controller.publish('schedule-1');

    expect(schedulesService.approveSchedule).toHaveBeenCalledWith('schedule-1');
    expect(schedulesService.rejectSchedule).toHaveBeenCalledWith('schedule-1', {
      reason: 'Too many uncovered shifts.',
    });
    expect(schedulesService.publishSchedule).toHaveBeenCalledWith('schedule-1');
  });
});
