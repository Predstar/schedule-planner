import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityService } from '../../availability/availability.service';
import type { AuthUserPayload } from '../../auth/types/auth-user-payload.type';
import { EmployeesController } from '../employees.controller';
import { EmployeesService } from '../employees.service';

describe('EmployeesController', () => {
  const employeesService = {
    createEmployee: vi.fn(),
    getEmployeeById: vi.fn(),
    listEmployees: vi.fn(),
    updateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
  } as unknown as EmployeesService;
  const availabilityService = {
    getEmployeeAvailability: vi.fn(),
  } as unknown as AvailabilityService;

  let controller: EmployeesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EmployeesController(employeesService, availabilityService);
  });

  it('returns the employee response shape for create', async () => {
    employeesService.createEmployee = vi.fn().mockResolvedValue({
      id: 'employee-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@restaurant.com',
      phone: '+49123456789',
      employmentType: 'PART_TIME',
      employeeRole: 'WAITER',
      weeklyHourLimit: 25,
      active: true,
    });

    await expect(
      controller.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@restaurant.com',
        phone: '+49123456789',
        employmentType: 'PART_TIME',
        employeeRole: 'WAITER',
        weeklyHourLimit: 25,
      }),
    ).resolves.toEqual({
      id: 'employee-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@restaurant.com',
      phone: '+49123456789',
      employmentType: 'PART_TIME',
      employeeRole: 'WAITER',
      weeklyHourLimit: 25,
      active: true,
    });
  });

  it('passes auth user through for get by id', async () => {
    const authUser: AuthUserPayload = {
      id: 'user-1',
      email: 'john.doe@restaurant.com',
      systemRole: 'EMPLOYEE',
      employeeId: 'employee-1',
    };

    employeesService.getEmployeeById = vi.fn().mockResolvedValue({
      id: 'employee-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@restaurant.com',
      phone: '+49123456789',
      employmentType: 'PART_TIME',
      employeeRole: 'WAITER',
      weeklyHourLimit: 25,
      active: true,
    });

    await controller.getById('employee-1', authUser);

    expect(employeesService.getEmployeeById).toHaveBeenCalledWith('employee-1', authUser);
  });

  it('passes availability request through for employee availability lookups', async () => {
    const authUser: AuthUserPayload = {
      id: 'user-1',
      email: 'john.doe@restaurant.com',
      systemRole: 'EMPLOYEE',
      employeeId: 'employee-1',
    };

    availabilityService.getEmployeeAvailability = vi.fn().mockResolvedValue({
      id: 'availability-1',
      employeeId: 'employee-1',
      weekStartDate: '2026-04-06',
      status: 'SUBMITTED',
      entries: [],
    });

    await controller.getAvailability('employee-1', { weekStartDate: '2026-04-06' }, authUser);

    expect(availabilityService.getEmployeeAvailability).toHaveBeenCalledWith(
      'employee-1',
      { weekStartDate: '2026-04-06' },
      authUser,
    );
  });
});
