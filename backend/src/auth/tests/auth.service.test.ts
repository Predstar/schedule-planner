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
      create: vi.fn(),
      update: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  const jwtService = {
    signAsync: vi.fn(),
  } as unknown as JwtService;

  const mailService = {
    sendConfirmationEmail: vi.fn(),
  } as any;

  let authService: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    prismaService.employee.findUnique = vi.fn().mockResolvedValue(null);
    authService = new AuthService(prismaService, jwtService, mailService);
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
        employeeId: 'employee-1',
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

  it('throws 403 EMAIL_NOT_CONFIRMED when password is correct but the account is not active', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({
      id: 'user-2',
      email: 'newbie@restaurant.com',
      passwordHash: hashSync('password123', 4),
      systemRole: 'EMPLOYEE',
      employeeId: null,
      active: false,
    });

    try {
      await authService.login({
        email: 'newbie@restaurant.com',
        password: 'password123',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('EMAIL_NOT_CONFIRMED');
      expect((error as AppException).getStatus()).toBe(403);
      return;
    }

    throw new Error('Expected EMAIL_NOT_CONFIRMED to throw');
  });

  it('registers a new account as inactive EMPLOYEE and sends a confirmation email', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.user.create = vi.fn().mockResolvedValue({ id: 'user-3' });

    const result = await authService.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@restaurant.com',
      password: 'password123',
    });

    expect(result.message).toMatch(/check your email/i);
    expect(prismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'jane@restaurant.com',
          systemRole: 'EMPLOYEE',
          employeeId: null,
          active: false,
        }),
      }),
    );
    expect(mailService.sendConfirmationEmail).toHaveBeenCalledWith('jane@restaurant.com', expect.any(String));
  });

  it('auto-links to a matching, unclaimed Employee record on registration', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.user.create = vi.fn().mockResolvedValue({ id: 'user-4' });
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'employee-9', user: null });

    await authService.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@restaurant.com',
      password: 'password123',
    });

    expect(prismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ employeeId: 'employee-9' }),
      }),
    );
  });

  it('does not auto-link when the matching Employee is already claimed by another user', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);
    prismaService.user.create = vi.fn().mockResolvedValue({ id: 'user-5' });
    prismaService.employee.findUnique = vi.fn().mockResolvedValue({ id: 'employee-9', user: { id: 'other-user' } });

    await authService.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@restaurant.com',
      password: 'password123',
    });

    expect(prismaService.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ employeeId: null }),
      }),
    );
  });

  it('rejects registration when the email is already in use', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({ id: 'existing-user' });

    await expect(
      authService.register({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'taken@restaurant.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({ code: 'USER_EMAIL_ALREADY_EXISTS' });
  });

  it('confirms an account and clears the confirmation token', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue({ id: 'user-3', confirmationToken: 'abc123' });
    prismaService.user.update = vi.fn().mockResolvedValue({ id: 'user-3', active: true });

    const result = await authService.confirmEmail({ token: 'abc123' });

    expect(result.message).toMatch(/confirmed/i);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'user-3' },
      data: { active: true, confirmationToken: null },
    });
  });

  it('rejects confirmation with an invalid token', async () => {
    prismaService.user.findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      authService.confirmEmail({ token: 'does-not-exist' }),
    ).rejects.toMatchObject({ code: 'INVALID_CONFIRMATION_TOKEN' });
  });
});
