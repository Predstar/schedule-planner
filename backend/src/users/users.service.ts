import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { CreateEmployeeUserDto } from './dto/create-employee-user.dto';
import type { CreateManagerUserDto } from './dto/create-manager-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';

type AdminBootstrapInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

type AdminBootstrapResult = {
  user: UserResponseDto;
  created: boolean;
};

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async ensureAdminAccount(dto: AdminBootstrapInput): Promise<AdminBootstrapResult> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.systemRole !== 'ADMIN') {
        throw new AppException(
          409,
          'ADMIN_BOOTSTRAP_EMAIL_CONFLICT',
          'Admin bootstrap email is already used by a non-admin account',
        );
      }

      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          systemRole: existingUser.systemRole,
          active: existingUser.active,
        },
        created: false,
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        systemRole: 'ADMIN',
        employeeId: null,
        active: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        systemRole: user.systemRole,
        active: user.active,
      },
      created: true,
    };
  }

  async createManagerAccount(dto: CreateManagerUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppException(409, 'USER_EMAIL_ALREADY_EXISTS', 'User email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        systemRole: 'MANAGER',
        employeeId: null,
        active: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      active: user.active,
    };
  }

  async createEmployeeAccount(dto: CreateEmployeeUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppException(409, 'USER_EMAIL_ALREADY_EXISTS', 'User email already exists');
    }

    const employee = await this.prismaService.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    if (employee.email !== dto.email) {
      throw new AppException(
        409,
        'EMPLOYEE_EMAIL_MISMATCH',
        'Employee account email must match employee profile email',
      );
    }

    const existingEmployeeUser = await this.prismaService.user.findUnique({
      where: { employeeId: dto.employeeId },
    });

    if (existingEmployeeUser) {
      throw new AppException(
        409,
        'EMPLOYEE_USER_ALREADY_EXISTS',
        'Employee user already exists',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        passwordHash,
        systemRole: 'EMPLOYEE',
        employeeId: dto.employeeId,
        active: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      employeeId: user.employeeId ?? undefined,
      active: user.active,
    };
  }
}
