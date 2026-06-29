import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSync } from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../shared/exceptions/app.exception';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  const prismaService = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(prismaService);
  });

  it('creates a manager account', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.user.create = vi.fn().mockResolvedValue({
      id: 'manager-1',
      email: 'manager@restaurant.com',
      passwordHash: hashSync('temporaryPassword123', 4),
      firstName: 'Maria',
      lastName: 'Meyer',
      systemRole: 'MANAGER',
      employeeId: null,
      active: true,
    });

    await expect(
      usersService.createManagerAccount({
        email: 'manager@restaurant.com',
        password: 'temporaryPassword123',
        firstName: 'Maria',
        lastName: 'Meyer',
      }),
    ).resolves.toEqual({
      id: 'manager-1',
      email: 'manager@restaurant.com',
      systemRole: 'MANAGER',
      active: true,
    });

    expect(prismaService.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: 'Maria',
        lastName: 'Meyer',
      }),
    });
  });

  it('creates an admin account during bootstrap', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.user.create = vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@restaurant.com',
      passwordHash: hashSync('temporaryPassword123', 4),
      firstName: 'Alice',
      lastName: 'Admin',
      systemRole: 'ADMIN',
      employeeId: null,
      active: true,
    });

    await expect(
      usersService.ensureAdminAccount({
        email: 'admin@restaurant.com',
        password: 'temporaryPassword123',
        firstName: 'Alice',
        lastName: 'Admin',
      }),
    ).resolves.toEqual({
      user: {
        id: 'admin-1',
        email: 'admin@restaurant.com',
        systemRole: 'ADMIN',
        active: true,
      },
      created: true,
    });
  });

  it('returns the existing admin account during bootstrap', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@restaurant.com',
      systemRole: 'ADMIN',
      active: true,
    });

    await expect(
      usersService.ensureAdminAccount({
        email: 'admin@restaurant.com',
        password: 'temporaryPassword123',
        firstName: 'Alice',
        lastName: 'Admin',
      }),
    ).resolves.toEqual({
      user: {
        id: 'admin-1',
        email: 'admin@restaurant.com',
        systemRole: 'ADMIN',
        active: true,
      },
      created: false,
    });
  });

  it('rejects admin bootstrap when the email belongs to a non-admin user', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({
      id: 'manager-1',
      email: 'admin@restaurant.com',
      systemRole: 'MANAGER',
      active: true,
    });

    try {
      await usersService.ensureAdminAccount({
        email: 'admin@restaurant.com',
        password: 'temporaryPassword123',
        firstName: 'Alice',
        lastName: 'Admin',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ADMIN_BOOTSTRAP_EMAIL_CONFLICT');
      return;
    }

    throw new Error('Expected ADMIN_BOOTSTRAP_EMAIL_CONFLICT');
  });

  it('rejects duplicate email for manager creation', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({ id: 'existing-user' });

    try {
      await usersService.createManagerAccount({
        email: 'manager@restaurant.com',
        password: 'temporaryPassword123',
        firstName: 'Maria',
        lastName: 'Meyer',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('USER_EMAIL_ALREADY_EXISTS');
      return;
    }

    throw new Error('Expected USER_EMAIL_ALREADY_EXISTS');
  });

  it('rejects employee account creation for a missing employee', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(null);

    try {
      await usersService.createEmployeeAccount({
        email: 'john.doe@restaurant.com',
        password: 'temporaryPassword123',
        employeeId: '11111111-1111-1111-1111-111111111111',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('EMPLOYEE_NOT_FOUND');
      return;
    }

    throw new Error('Expected EMPLOYEE_NOT_FOUND');
  });

  it('creates an employee account', async () => {
    prismaService.user.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'john.doe@restaurant.com',
    });
    prismaService.user.create = vi.fn().mockResolvedValue({
      id: 'employee-user-1',
      email: 'john.doe@restaurant.com',
      passwordHash: hashSync('temporaryPassword123', 4),
      systemRole: 'EMPLOYEE',
      employeeId: '11111111-1111-1111-1111-111111111111',
      active: true,
    });

    await expect(
      usersService.createEmployeeAccount({
        email: 'john.doe@restaurant.com',
        password: 'temporaryPassword123',
        employeeId: '11111111-1111-1111-1111-111111111111',
      }),
    ).resolves.toEqual({
      id: 'employee-user-1',
      email: 'john.doe@restaurant.com',
      systemRole: 'EMPLOYEE',
      employeeId: '11111111-1111-1111-1111-111111111111',
      active: true,
    });
  });

  it('rejects employee account creation when the employee already has a user', async () => {
    prismaService.user.findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-employee-user' });
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'john.doe@restaurant.com',
    });

    try {
      await usersService.createEmployeeAccount({
        email: 'john.doe@restaurant.com',
        password: 'temporaryPassword123',
        employeeId: '11111111-1111-1111-1111-111111111111',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('EMPLOYEE_USER_ALREADY_EXISTS');
      return;
    }

    throw new Error('Expected EMPLOYEE_USER_ALREADY_EXISTS');
  });

  it('rejects duplicate email for employee creation', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({ id: 'existing-user' });

    try {
      await usersService.createEmployeeAccount({
        email: 'john.doe@restaurant.com',
        password: 'temporaryPassword123',
        employeeId: '11111111-1111-1111-1111-111111111111',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('USER_EMAIL_ALREADY_EXISTS');
      return;
    }

    throw new Error('Expected USER_EMAIL_ALREADY_EXISTS');
  });

  it('rejects employee account creation when the email does not match the employee profile', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'john.doe@restaurant.com',
    });

    try {
      await usersService.createEmployeeAccount({
        email: 'john.login@restaurant.com',
        password: 'temporaryPassword123',
        employeeId: '11111111-1111-1111-1111-111111111111',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('EMPLOYEE_EMAIL_MISMATCH');
      return;
    }

    throw new Error('Expected EMPLOYEE_EMAIL_MISMATCH');
  });
});
