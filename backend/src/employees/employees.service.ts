import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import type { EmployeeRole, EmploymentType } from './employees.constants';

function mapEmployee(employee: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentType: EmploymentType;
  employeeRole: EmployeeRole;
  weeklyHourLimit: number;
  active: boolean;
}): EmployeeResponseDto {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    employmentType: employee.employmentType,
    employeeRole: employee.employeeRole,
    weeklyHourLimit: employee.weeklyHourLimit,
    active: employee.active,
  };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createEmployee(dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const existingEmployee = await this.prismaService.employee.findUnique({
      where: { email: dto.email },
    });

    if (existingEmployee) {
      throw new AppException(409, 'EMPLOYEE_EMAIL_ALREADY_EXISTS', 'Employee email already exists');
    }

    const employee = await this.prismaService.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone ?? null,
        employmentType: dto.employmentType,
        employeeRole: dto.employeeRole,
        weeklyHourLimit: dto.weeklyHourLimit,
        active: true,
      },
    });

    return mapEmployee(employee);
  }

  async getEmployeeById(
    employeeId: string,
    authUser: AuthUserPayload,
  ): Promise<EmployeeResponseDto> {
    if (authUser.systemRole === 'EMPLOYEE' && authUser.employeeId !== employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Access denied');
    }

    const employee = await this.prismaService.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    return mapEmployee(employee);
  }

  async listEmployees(query: ListEmployeesQueryDto): Promise<EmployeeResponseDto[]> {
    const where: Prisma.EmployeeWhereInput = {};

    if (query.active !== undefined) {
      where.active = query.active;
    }

    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    if (query.employeeRole) {
      where.employeeRole = query.employeeRole;
    }

    const employees = await this.prismaService.employee.findMany({ where });
    return employees.map(mapEmployee);
  }

  async updateEmployee(
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    const existingEmployee = await this.prismaService.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const employee = await this.prismaService.employee.update({
      where: { id: employeeId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        employmentType: dto.employmentType,
        employeeRole: dto.employeeRole,
        weeklyHourLimit: dto.weeklyHourLimit,
        active: dto.active,
      },
    });

    return mapEmployee(employee);
  }

  async deactivateEmployee(employeeId: string): Promise<EmployeeResponseDto> {
    const existingEmployee = await this.prismaService.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const employee = await this.prismaService.employee.update({
      where: { id: employeeId },
      data: { active: false },
    });

    return mapEmployee(employee);
  }
}
