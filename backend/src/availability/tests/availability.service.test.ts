import { DateTime } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { AvailabilityService } from '../availability.service';

describe('AvailabilityService', () => {
  const prismaService = {
    employee: {
      findUnique: vi.fn(),
    },
    availability: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    availabilityEntry: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;

  let availabilityService: AvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    availabilityService = new AvailabilityService(
      prismaService,
      () => DateTime.fromISO('2026-04-03T10:00:00', { zone: 'Europe/Berlin' }),
    );
  });

  it('allows EMPLOYEE submitting own availability before the Berlin deadline', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'employee-1' });
    prismaService.availability.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.availability.create = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'SUBMITTED',
      entries: [
        {
          date: new Date('2026-04-06T00:00:00.000Z'),
          startTime: '09:00',
          endTime: '17:00',
          available: true,
          preferred: true,
        },
      ],
    });

    await expect(
      availabilityService.submitAvailability(
        {
          employeeId: 'employee-1',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-06',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      ),
    ).resolves.toEqual({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: '2026-04-06',
      status: 'SUBMITTED',
      entries: [
        {
          date: '2026-04-06',
          startTime: '09:00',
          endTime: '17:00',
          available: true,
          preferred: true,
        },
      ],
    });
  });

  it('rejects EMPLOYEE submitting another employee availability with 403 ACCESS_DENIED', async () => {
    try {
      await availabilityService.submitAvailability(
        {
          employeeId: 'employee-2',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-06',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('rejects double submission with 409 AVAILABILITY_ALREADY_SUBMITTED', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'employee-1' });
    prismaService.availability.findUnique = vi.fn().mockResolvedValue({ id: 'availability-1' });

    try {
      await availabilityService.submitAvailability(
        {
          employeeId: 'employee-1',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-06',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('AVAILABILITY_ALREADY_SUBMITTED');
      return;
    }

    throw new Error('Expected AVAILABILITY_ALREADY_SUBMITTED');
  });

  it('rejects EMPLOYEE submit after the Berlin deadline with 409 AVAILABILITY_DEADLINE_PASSED', async () => {
    const afterDeadlineService = new AvailabilityService(
      prismaService,
      () => DateTime.fromISO('2026-04-04T00:00:00', { zone: 'Europe/Berlin' }),
    );

    try {
      await afterDeadlineService.submitAvailability(
        {
          employeeId: 'employee-1',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-06',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('AVAILABILITY_DEADLINE_PASSED');
      return;
    }

    throw new Error('Expected AVAILABILITY_DEADLINE_PASSED');
  });

  it('denies ADMIN submitting employee availability with 403 ACCESS_DENIED', async () => {
    await expect(
      availabilityService.submitAvailability(
        {
          employeeId: 'employee-1',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-06',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'admin-1',
          email: 'admin@restaurant.com',
          systemRole: 'ADMIN',
          employeeId: null,
        },
      ),
    ).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });

  it('rejects EMPLOYEE update after the Berlin deadline with 409 AVAILABILITY_DEADLINE_PASSED', async () => {
    prismaService.availability.findUnique = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'SUBMITTED',
      entries: [],
    });

    const afterDeadlineService = new AvailabilityService(
      prismaService,
      () => DateTime.fromISO('2026-04-04T00:00:00', { zone: 'Europe/Berlin' }),
    );

    try {
      await afterDeadlineService.updateAvailability(
        'availability-1',
        {
          entries: [
            {
              date: '2026-04-06',
              startTime: '10:00',
              endTime: '14:00',
              available: true,
              preferred: false,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('AVAILABILITY_DEADLINE_PASSED');
      return;
    }

    throw new Error('Expected AVAILABILITY_DEADLINE_PASSED');
  });

  it('replaces entries on employee self-service update inside a transaction', async () => {
    prismaService.availability.findUnique = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'SUBMITTED',
      entries: [],
    });
    prismaService.$transaction = vi.fn().mockImplementation(async (callback: Function) =>
      callback({
        availabilityEntry: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        availability: {
          update: vi.fn().mockResolvedValue({
            id: 'availability-1',
            employeeId: 'employee-1',
            weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
            status: 'SUBMITTED',
            entries: [
              {
                date: new Date('2026-04-07T00:00:00.000Z'),
                startTime: '10:00',
                endTime: '14:00',
                available: true,
                preferred: false,
              },
            ],
          }),
        },
      }),
    );

    await expect(
      availabilityService.updateAvailability(
        'availability-1',
        {
          entries: [
            {
              date: '2026-04-07',
              startTime: '10:00',
              endTime: '14:00',
              available: true,
              preferred: false,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      ),
    ).resolves.toEqual({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: '2026-04-06',
      status: 'SUBMITTED',
      entries: [
        {
          date: '2026-04-07',
          startTime: '10:00',
          endTime: '14:00',
          available: true,
          preferred: false,
        },
      ],
    });
  });

  it('denies MANAGER updating employee availability with 403 ACCESS_DENIED', async () => {
    prismaService.availability.findUnique = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      status: 'SUBMITTED',
      entries: [],
    });

    await expect(
      availabilityService.updateAvailability(
        'availability-1',
        {
          entries: [
            {
              date: '2026-04-07',
              startTime: '10:00',
              endTime: '14:00',
              available: true,
              preferred: false,
            },
          ],
        },
        {
          id: 'manager-1',
          email: 'manager@restaurant.com',
          systemRole: 'MANAGER',
          employeeId: null,
        },
      ),
    ).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });

  it('denies EMPLOYEE reading another employee availability', async () => {
    try {
      await availabilityService.getEmployeeAvailability(
        'employee-2',
        { weekStartDate: '2026-04-06' },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('lists weekly availability for managers', async () => {
    prismaService.availability.findMany = vi.fn().mockResolvedValue([
      {
        id: 'availability-1',
        employeeId: 'employee-1',
        weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
        status: 'SUBMITTED',
        entries: [],
      },
    ]);

    await expect(
      availabilityService.listAvailability({ weekStartDate: '2026-04-06' }),
    ).resolves.toEqual([
      {
        id: 'availability-1',
        employeeId: 'employee-1',
        weekStartDate: '2026-04-06',
        status: 'SUBMITTED',
        entries: [],
      },
    ]);
  });

  it('rejects entries outside the requested week with 400 VALIDATION_ERROR', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'employee-1' });

    try {
      await availabilityService.submitAvailability(
        {
          employeeId: 'employee-1',
          weekStartDate: '2026-04-06',
          entries: [
            {
              date: '2026-04-13',
              startTime: '09:00',
              endTime: '17:00',
              available: true,
              preferred: true,
            },
          ],
        },
        {
          id: 'user-1',
          email: 'john.doe@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('VALIDATION_ERROR');
      return;
    }

    throw new Error('Expected VALIDATION_ERROR');
  });
});
