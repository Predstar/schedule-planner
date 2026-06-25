import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  const authService = {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  } as unknown as AuthService;

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(authService);
  });

  it('returns the current user for /auth/me happy path', async () => {
    authService.getCurrentUser = vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'manager@restaurant.com',
      systemRole: 'MANAGER',
      employeeId: 'employee-1',
    });

    await expect(
      controller.getMe({
        id: 'user-1',
        email: 'manager@restaurant.com',
        systemRole: 'MANAGER',
        employeeId: 'employee-1',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'manager@restaurant.com',
      systemRole: 'MANAGER',
      employeeId: 'employee-1',
    });
  });
});
