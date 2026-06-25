import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  const usersService = {
    createManagerAccount: vi.fn(),
    createEmployeeAccount: vi.fn(),
  } as unknown as UsersService;

  let controller: UsersController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new UsersController(usersService);
  });

  it('returns the manager response shape', async () => {
    usersService.createManagerAccount = vi.fn().mockResolvedValue({
      id: 'manager-1',
      email: 'manager@restaurant.com',
      systemRole: 'MANAGER',
      active: true,
    });

    await expect(
      controller.createManager({
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
  });

  it('returns the employee response shape', async () => {
    usersService.createEmployeeAccount = vi.fn().mockResolvedValue({
      id: 'employee-user-1',
      email: 'john.doe@restaurant.com',
      systemRole: 'EMPLOYEE',
      employeeId: '11111111-1111-1111-1111-111111111111',
      active: true,
    });

    await expect(
      controller.createEmployee({
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
});
