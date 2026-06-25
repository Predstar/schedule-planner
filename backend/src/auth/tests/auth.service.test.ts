import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSync } from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../shared/exceptions/app.exception';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const prismaService = {
    user: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    signAsync: vi.fn(),
  } as unknown as JwtService;

  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(prismaService, jwtService);
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns a token and mapped user for valid login', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'manager@restaurant.com',
      passwordHash: hashSync('password123', 4),
      systemRole: 'MANAGER',
      employeeId: 'employee-1',
      active: true,
    });
    jwtService.signAsync = vi.fn().mockResolvedValue('jwt-token');

    await expect(
      authService.login({
        email: 'manager@restaurant.com',
        password: 'password123',
      }),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      user: {
        id: 'user-1',
        email: 'manager@restaurant.com',
        systemRole: 'MANAGER',
      },
    });
  });

  it('throws 401 INVALID_CREDENTIALS for invalid credentials', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);

    try {
      await authService.login({
        email: 'missing@restaurant.com',
        password: 'password123',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('INVALID_CREDENTIALS');
      expect((error as AppException).getStatus()).toBe(401);
      return;
    }

    throw new Error('Expected invalid credentials to throw');
  });
});
