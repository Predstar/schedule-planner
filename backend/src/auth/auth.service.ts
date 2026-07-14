import { randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import { JWT_TOKEN_TYPE } from './auth.constants';
import type { ConfirmEmailRequestDto } from './dto/confirm-email-request.dto';
import type { CurrentUserResponseDto } from './dto/current-user-response.dto';
import type { LoginRequestDto } from './dto/login-request.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import type { RegisterRequestDto } from './dto/register-request.dto';
import type { RegisterResponseDto } from './dto/register-response.dto';
import { MailService } from './mail.service';
import type { AuthUserPayload, JwtPayload } from './types/auth-user-payload.type';

const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppException(409, 'USER_EMAIL_ALREADY_EXISTS', 'User email already exists');
    }

    // If a manager already created an Employee profile with this email
    // (and no other User has claimed it), auto-link the new account to it.
    const matchingEmployee = await this.prismaService.employee.findUnique({
      where: { email: dto.email },
      include: { user: true },
    });
    const employeeId = matchingEmployee && !matchingEmployee.user ? matchingEmployee.id : null;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const confirmationToken = randomBytes(32).toString('hex');
    const confirmationTokenExpiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);

    await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        systemRole: 'EMPLOYEE',
        employeeId,
        active: false,
        confirmationToken,
        confirmationTokenExpiresAt,
      },
    });

    await this.mailService.sendConfirmationEmail(dto.email, confirmationToken);

    return {
      message: 'Account created. Check your email to confirm your address before logging in.',
    };
  }

  async confirmEmail(dto: ConfirmEmailRequestDto): Promise<{ message: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { confirmationToken: dto.token },
    });

    if (!user) {
      throw new AppException(400, 'INVALID_CONFIRMATION_TOKEN', 'Invalid or expired confirmation token');
    }

    if (!user.confirmationTokenExpiresAt || user.confirmationTokenExpiresAt.getTime() < Date.now()) {
      throw new AppException(400, 'INVALID_CONFIRMATION_TOKEN', 'Invalid or expired confirmation token');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { active: true, confirmationToken: null, confirmationTokenExpiresAt: null },
    });

    return { message: 'Email confirmed. You can now log in.' };
  }

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    if (!user.active) {
      throw new AppException(403, 'EMAIL_NOT_CONFIRMED', 'Please confirm your email before logging in');
    }

    if (user.currentSessionId && user.sessionExpiresAt && user.sessionExpiresAt.getTime() > Date.now()) {
      throw new AppException(
        409,
        'ALREADY_LOGGED_IN',
        'This account is already logged in on another device',
      );
    }

    const sessionId = randomBytes(16).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { currentSessionId: sessionId, sessionExpiresAt },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      employeeId: user.employeeId,
      sessionId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: JWT_TOKEN_TYPE,
      user: {
        id: user.id,
        email: user.email,
        systemRole: user.systemRole,
        employeeId: user.employeeId ?? null,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { currentSessionId: null, sessionExpiresAt: null },
    });
  }

  async getCurrentUser(user: AuthUserPayload): Promise<CurrentUserResponseDto> {
    const currentUser = await this.prismaService.user.findUnique({
      where: { id: user.id },
    });

    if (!currentUser || !currentUser.active) {
      throw new UnauthorizedException();
    }

    return {
      id: currentUser.id,
      email: currentUser.email,
      systemRole: currentUser.systemRole,
      employeeId: currentUser.employeeId,
    };
  }
}
