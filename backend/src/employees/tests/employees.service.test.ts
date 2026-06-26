import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../shared/exceptions/app.exception';
import { EmployeesService } from '../employees.service';

describe('EmployeesService', () => {
  const prismaService = {
    employee: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;

  let employeesService: EmployeesService;

  beforeEach(() => {
    vi.clearAllMocks();
    employeesService = new EmployeesService(prismaService);
  });

  it('creates an employee profile', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.employee.create = vi.fn().mockResolvedValue({
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
      employeesService.createEmployee({
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

  it('rejects duplicate email on create with 409 EMPLOYEE_EMAIL_ALREADY_EXISTS', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'existing-employee' });

    try {
      await employeesService.createEmployee({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@restaurant.com',
        phone: '+49123456789',
        employmentType: 'PART_TIME',
        employeeRole: 'WAITER',
        weeklyHourLimit: 25,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('EMPLOYEE_EMAIL_ALREADY_EXISTS');
      return;
    }

    throw new Error('Expected EMPLOYEE_EMAIL_ALREADY_EXISTS');
  });

  it('allows EMPLOYEE fetching own profile', async () => {
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({
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
      employeesService.getEmployeeById('employee-1', {
        id: 'user-1',
        email: 'john.doe@restaurant.com',
        systemRole: 'EMPLOYEE',
        employeeId: 'employee-1',
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

  it("rejects EMPLOYEE fetching another employee's profile with 403 ACCESS_DENIED", async () => {
    try {
      await employeesService.getEmployeeById('employee-2', {
        id: 'user-1',
        email: 'john.doe@restaurant.com',
        systemRole: 'EMPLOYEE',
        employeeId: 'employee-1',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('applies list filters independently and combined', async () => {
    prismaService.employee.findMany = vi.fn().mockResolvedValue([]);

    await employeesService.listEmployees({ active: true });
    expect(prismaService.employee.findMany).toHaveBeenNthCalledWith(1, {
      where: { active: true },
    });

    await employeesService.listEmployees({ employmentType: 'PART_TIME' });
    expect(prismaService.employee.findMany).toHaveBeenNthCalledWith(2, {
      where: { employmentType: 'PART_TIME' },
    });

    await employeesService.listEmployees({ employeeRole: 'WAITER' });
    expect(prismaService.employee.findMany).toHaveBeenNthCalledWith(3, {
      where: { employeeRole: 'WAITER' },
    });

    await employeesService.listEmployees({
      active: true,
      employmentType: 'PART_TIME',
      employeeRole: 'WAITER',
    });
    expect(prismaService.employee.findMany).toHaveBeenNthCalledWith(4, {
      where: {
        active: true,
        employmentType: 'PART_TIME',
        employeeRole: 'WAITER',
      },
    });
  });
});
