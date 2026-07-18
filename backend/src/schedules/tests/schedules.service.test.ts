import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { SchedulesService } from '../schedules.service';

function draftSchedule(overrides: Partial<any> = {}) {
  return {
    id: 'schedule-1',
    weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
    status: 'DRAFT',
    assignments: [],
    ...overrides,
  };
}

function approvedSchedule() {
  return draftSchedule({ status: 'APPROVED' });
}

// A Monday far enough in the future that "week already ended" guards never trip in tests.
function futureMonday() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function waiterShift(overrides: Partial<any> = {}) {
  return {
    id: 'shift-1',
    date: new Date('2026-04-07T00:00:00.000Z'),
    startTime: '10:00',
    endTime: '14:00',
    employeeRole: 'WAITER',
    requiredCount: 1,
    ...overrides,
  };
}

function waiterEmployee(overrides: Partial<any> = {}) {
  return {
    id: 'employee-1',
    employeeRole: 'WAITER',
    weeklyHourLimit: 20,
    ...overrides,
  };
}

function submittedAvailability(overrides: Partial<any> = {}) {
  return {
    id: 'availability-1',
    employeeId: 'employee-1',
    weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
    status: 'SUBMITTED',
    entries: [
      {
        date: new Date('2026-04-07T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '17:00',
        available: true,
        preferred: false,
      },
    ],
    ...overrides,
  };
}

describe('SchedulesService', () => {
  const prismaService = {
    schedule: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    scheduleAssignment: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    shift: {
      findUnique: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
    availability: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  } as any;

  const notificationsService = {
    notifyScheduleDraftGenerated: vi.fn(),
    notifySchedulePublished: vi.fn(),
    notifySwapDecision: vi.fn(),
    notifyShiftClaimDecision: vi.fn(),
  } as any;

  let schedulesService: SchedulesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaService.scheduleAssignment.findMany.mockResolvedValue([]);
    prismaService.user.findMany.mockResolvedValue([]);
    schedulesService = new SchedulesService(prismaService, notificationsService);
  });

  it('creates a draft schedule', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.schedule.create = vi.fn().mockResolvedValue(draftSchedule());

    await expect(
      schedulesService.createDraftSchedule({ weekStartDate: '2026-04-06' }),
    ).resolves.toEqual({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });
  });

  it('gets a weekly schedule', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());

    await expect(
      schedulesService.getWeeklySchedule({ weekStartDate: '2026-04-06' }),
    ).resolves.toEqual({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [],
    });
  });

  it('approving a DRAFT schedule publishes it directly, with no separate publish step', async () => {
    const weekStartDate = futureMonday();
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule({ weekStartDate }));
    prismaService.schedule.update = vi.fn().mockResolvedValue(
      draftSchedule({ weekStartDate, status: 'PUBLISHED' }),
    );

    await expect(
      schedulesService.approveSchedule('schedule-1'),
    ).resolves.toMatchObject({ status: 'PUBLISHED' });

    expect(prismaService.schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });

  it('rejects approving a schedule that is not in DRAFT status', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(approvedSchedule());

    await expect(
      schedulesService.approveSchedule('schedule-1'),
    ).rejects.toMatchObject({ code: 'SCHEDULE_NOT_IN_DRAFT_STATUS' });
  });

  it('rejects approving a DRAFT schedule whose week has already ended with 409 SCHEDULE_WEEK_IN_PAST', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(
      draftSchedule({ weekStartDate: new Date('2020-01-06T00:00:00.000Z') }),
    );

    await expect(
      schedulesService.approveSchedule('schedule-1'),
    ).rejects.toMatchObject({ code: 'SCHEDULE_WEEK_IN_PAST' });
  });

  it('WAITER employee sees all published WAITER assignments across multiple employees and zero BARTENDER assignments', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(
      waiterEmployee({
        id: 'employee-1',
        firstName: 'Alice',
        lastName: 'Waiter',
      }),
    );
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'PUBLISHED',
      assignments: [
        {
          id: 'assignment-1',
          shiftId: 'shift-1',
          employeeId: 'employee-1',
          shift: waiterShift(),
          employee: {
            firstName: 'Alice',
            lastName: 'Waiter',
          },
        },
        {
          id: 'assignment-2',
          shiftId: 'shift-2',
          employeeId: 'employee-2',
          shift: waiterShift({
            id: 'shift-2',
            date: new Date('2026-04-08T00:00:00.000Z'),
            startTime: '17:00',
            endTime: '21:00',
          }),
          employee: {
            firstName: 'Bob',
            lastName: 'Waiter',
          },
        },
      ],
    });

    await expect(
      schedulesService.getMyRolePublishedSchedule(
        { weekStartDate: '2026-04-06' },
        {
          id: 'user-1',
          email: 'alice@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      ),
    ).resolves.toEqual({
      weekStartDate: '2026-04-06',
      employeeRole: 'WAITER',
      status: 'PUBLISHED',
      assignments: [
        {
          assignmentId: 'assignment-1',
          shiftId: 'shift-1',
          employeeId: 'employee-1',
          employeeName: 'Alice Waiter',
          date: '2026-04-07',
          startTime: '10:00',
          endTime: '14:00',
          employeeRole: 'WAITER',
        },
        {
          assignmentId: 'assignment-2',
          shiftId: 'shift-2',
          employeeId: 'employee-2',
          employeeName: 'Bob Waiter',
          date: '2026-04-08',
          startTime: '17:00',
          endTime: '21:00',
          employeeRole: 'WAITER',
        },
      ],
    });
  });

  it('request against a non-PUBLISHED schedule returns nothing', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(waiterEmployee());
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());

    try {
      await schedulesService.getMyRolePublishedSchedule(
        { weekStartDate: '2026-04-06' },
        {
          id: 'user-1',
          email: 'waiter@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect((error as AppException).code).toBe('SCHEDULE_NOT_FOUND');
      return;
    }

    throw new Error('Expected SCHEDULE_NOT_FOUND');
  });

  it('ADMIN and MANAGER still see everything through the general weekly schedule endpoint regardless of status', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue({
      id: 'schedule-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'APPROVED',
      assignments: [
        {
          id: 'assignment-1',
          shiftId: 'shift-1',
          employeeId: 'employee-1',
          shift: waiterShift({ id: 'shift-1' }),
          employee: { firstName: 'Alice', lastName: 'Smith' },
        },
        {
          id: 'assignment-2',
          shiftId: 'shift-2',
          employeeId: 'employee-2',
          shift: waiterShift({ id: 'shift-2', date: new Date('2026-04-08T00:00:00.000Z') }),
          employee: { firstName: 'Bob', lastName: 'Jones' },
        },
      ],
    });

    await expect(
      schedulesService.getWeeklySchedule({ weekStartDate: '2026-04-06' }),
    ).resolves.toEqual({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'APPROVED',
      assignments: [
        {
          assignmentId: 'assignment-1',
          shiftId: 'shift-1',
          employeeId: 'employee-1',
          employeeName: 'Alice Smith',
          date: '2026-04-07',
          startTime: '10:00',
          endTime: '14:00',
          employeeRole: 'WAITER',
        },
        {
          assignmentId: 'assignment-2',
          shiftId: 'shift-2',
          employeeId: 'employee-2',
          employeeName: 'Bob Jones',
          date: '2026-04-08',
          startTime: '10:00',
          endTime: '14:00',
          employeeRole: 'WAITER',
        },
      ],
    });
  });

  it('rejects assignment mutation on non-DRAFT schedules with 409 SCHEDULE_NOT_EDITABLE', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(approvedSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(waiterEmployee());

    try {
      await schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      });
    } catch (error) {
      expect((error as AppException).code).toBe('SCHEDULE_NOT_EDITABLE');
      return;
    }

    throw new Error('Expected SCHEDULE_NOT_EDITABLE');
  });

  it('rejects mismatched employee roles with 409 EMPLOYEE_ROLE_MISMATCH', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi
      .fn()
      .mockResolvedValue(waiterEmployee({ employeeRole: 'RUNNER' }));

    try {
      await schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      });
    } catch (error) {
      expect((error as AppException).code).toBe('EMPLOYEE_ROLE_MISMATCH');
      return;
    }

    throw new Error('Expected EMPLOYEE_ROLE_MISMATCH');
  });

  it('allows a manager to manually assign an employee to a shift outside their submitted availability', async () => {
    // Manual assignment is manager/admin-only (route-level RolesGuard), so it
    // intentionally does not check submitted availability — e.g. covering an
    // event where a shift starts earlier than the employee's usual window.
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(waiterEmployee());
    prismaService.scheduleAssignment.findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaService.$transaction = vi.fn().mockImplementation(async (callback: Function) =>
      callback({
        scheduleAssignment: {
          create: vi.fn().mockResolvedValue({
            id: 'assignment-1',
            scheduleId: 'schedule-1',
            shiftId: 'shift-1',
            employeeId: 'employee-1',
          }),
        },
        schedule: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(
            draftSchedule({
              assignments: [
                {
                  id: 'assignment-1',
                  shiftId: 'shift-1',
                  employeeId: 'employee-1',
                  shift: waiterShift({ id: 'shift-1' }),
                  employee: { firstName: 'Alice', lastName: 'Smith' },
                },
              ],
            }),
          ),
        },
      }),
    );

    await expect(
      schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      }),
    ).resolves.toMatchObject({ id: 'schedule-1' });
  });

  it('rejects overlapping shifts with 409 SHIFT_OVERLAP', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(waiterEmployee());
    prismaService.availability.findUnique = vi.fn().mockResolvedValue(submittedAvailability());
    prismaService.scheduleAssignment.findMany = vi.fn().mockResolvedValue([
      {
        id: 'assignment-existing',
        shift: waiterShift({
          id: 'shift-existing',
          startTime: '13:00',
          endTime: '16:00',
        }),
      },
    ]);

    try {
      await schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      });
    } catch (error) {
      expect((error as AppException).code).toBe('SHIFT_OVERLAP');
      return;
    }

    throw new Error('Expected SHIFT_OVERLAP');
  });

  it('rejects hour-limit overflow with 409 WEEKLY_HOUR_LIMIT_EXCEEDED', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi
      .fn()
      .mockResolvedValue(waiterEmployee({ weeklyHourLimit: 6 }));
    prismaService.availability.findUnique = vi.fn().mockResolvedValue(submittedAvailability());
    prismaService.scheduleAssignment.findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'assignment-existing',
          shift: waiterShift({
            id: 'shift-existing',
            date: new Date('2026-04-08T00:00:00.000Z'),
            startTime: '09:00',
            endTime: '13:00',
          }),
        },
      ]);

    try {
      await schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      });
    } catch (error) {
      expect((error as AppException).code).toBe('WEEKLY_HOUR_LIMIT_EXCEEDED');
      return;
    }

    throw new Error('Expected WEEKLY_HOUR_LIMIT_EXCEEDED');
  });

  it('allows a valid assignment when all validation rules pass', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());
    prismaService.shift.findUnique = vi.fn().mockResolvedValue(waiterShift());
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(waiterEmployee());
    prismaService.availability.findUnique = vi.fn().mockResolvedValue(submittedAvailability());
    prismaService.scheduleAssignment.findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaService.$transaction = vi.fn().mockImplementation(async (callback: Function) =>
      callback({
        scheduleAssignment: {
          create: vi.fn().mockResolvedValue({
            id: 'assignment-1',
            scheduleId: 'schedule-1',
            shiftId: 'shift-1',
            employeeId: 'employee-1',
          }),
        },
        schedule: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(
            draftSchedule({
              assignments: [
                {
                  id: 'assignment-1',
                  shiftId: 'shift-1',
                  employeeId: 'employee-1',
                  shift: waiterShift({ id: 'shift-1' }),
                  employee: { firstName: 'Alice', lastName: 'Smith' },
                },
              ],
            }),
          ),
        },
      }),
    );

    await expect(
      schedulesService.addAssignment('schedule-1', {
        shiftId: 'shift-1',
        employeeId: 'employee-1',
      }),
    ).resolves.toEqual({
      id: 'schedule-1',
      weekStartDate: '2026-04-06',
      status: 'DRAFT',
      assignments: [
        {
          assignmentId: 'assignment-1',
          shiftId: 'shift-1',
          employeeId: 'employee-1',
          employeeName: 'Alice Smith',
          date: '2026-04-07',
          startTime: '10:00',
          endTime: '14:00',
          employeeRole: 'WAITER',
        },
      ],
    });
  });

  it('approves a DRAFT schedule successfully', async () => {
    const weekStartDate = futureMonday();
    const weekStartIso = weekStartDate.toISOString().slice(0, 10);
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule({ weekStartDate }));
    prismaService.schedule.update = vi.fn().mockResolvedValue(
      draftSchedule({ weekStartDate, status: 'APPROVED' }),
    );

    await expect(schedulesService.approveSchedule('schedule-1')).resolves.toEqual({
      id: 'schedule-1',
      weekStartDate: weekStartIso,
      status: 'APPROVED',
      assignments: [],
    });
  });

  it('rejects approve from non-DRAFT with 409 SCHEDULE_NOT_IN_DRAFT_STATUS', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(approvedSchedule());

    try {
      await schedulesService.approveSchedule('schedule-1');
    } catch (error) {
      expect((error as AppException).code).toBe('SCHEDULE_NOT_IN_DRAFT_STATUS');
      return;
    }

    throw new Error('Expected SCHEDULE_NOT_IN_DRAFT_STATUS');
  });

  it('rejects publish before approval with 409 SCHEDULE_NOT_APPROVED', async () => {
    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(draftSchedule());

    try {
      await schedulesService.publishSchedule('schedule-1');
    } catch (error) {
      expect((error as AppException).code).toBe('SCHEDULE_NOT_APPROVED');
      return;
    }

    throw new Error('Expected SCHEDULE_NOT_APPROVED');
  });

  it('autoGenerateSchedule batches shift/assignment creation instead of one create per assignment', async () => {
    const weekStart = futureMonday();
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const shiftDate = new Date(weekStart.getTime() + 86400000); // Tuesday, inside the generated week

    prismaService.schedule.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.schedule.create = vi.fn().mockResolvedValue(draftSchedule({ weekStartDate: weekStart }));
    prismaService.scheduleAssignment.deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    prismaService.employee.findMany = vi.fn().mockResolvedValue([
      {
        ...waiterEmployee({ id: 'employee-1' }),
        availabilities: [
          {
            status: 'SUBMITTED',
            entries: [
              { date: shiftDate, startTime: '09:00', endTime: '18:00', available: true, preferred: false },
            ],
          },
        ],
      },
    ]);
    prismaService.scheduleAssignment.findMany.mockResolvedValueOnce([]); // historical assignments lookup

    let transactionOps = 0;
    prismaService.shift.create = vi.fn((args: any) =>
      Promise.resolve({ id: `shift-${++transactionOps}`, ...args.data }),
    );
    prismaService.$transaction = vi.fn().mockImplementation((arg: unknown[] | ((tx: unknown) => unknown)) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: unknown) => unknown)(prismaService);
    });
    prismaService.scheduleAssignment.createMany = vi.fn().mockResolvedValue({ count: 1 });
    prismaService.schedule.findUniqueOrThrow = vi.fn().mockResolvedValue(
      draftSchedule({ weekStartDate: weekStart, assignments: [] }),
    );

    await schedulesService.autoGenerateSchedule(weekStartIso);

    // One batched transaction call for all shift creates, not N sequential awaited creates.
    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaService.shift.create).toHaveBeenCalled();
    // Assignments are created via a single createMany, not per-assignment create.
    expect(prismaService.scheduleAssignment.createMany).toHaveBeenCalledTimes(1);
    expect(prismaService.scheduleAssignment.create).not.toHaveBeenCalled();
  });
});
