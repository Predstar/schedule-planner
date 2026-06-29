import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import { JWT_TOKEN_TYPE } from './auth.constants';
import type { CurrentUserResponseDto } from './dto/current-user-response.dto';
import type { LoginRequestDto } from './dto/login-request.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import type { AuthUserPayload, JwtPayload } from './types/auth-user-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.active) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      employeeId: user.employeeId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: JWT_TOKEN_TYPE,
      user: {
        id: user.id,
        email: user.email,
        systemRole: user.systemRole,
        employeeId: user.employeeId,
      },
    };
  }

  async register(dto: RegisterRequestDto): Promise<LoginResponseDto> {
    const existing = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new AppException(409, 'USER_EMAIL_ALREADY_EXISTS', 'Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        systemRole: 'EMPLOYEE',
        employeeId: null,
        active: true,
      },
      select: {
        id: true,
        email: true,
        systemRole: true,
        employeeId: true,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      employeeId: user.employeeId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: JWT_TOKEN_TYPE,
      user: {
        id: user.id,
        email: user.email,
        systemRole: user.systemRole,
        employeeId: user.employeeId,
      },
    };
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
