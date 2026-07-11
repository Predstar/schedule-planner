import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityResponseDto } from '../availability/dto/availability-response.dto';
import { AvailabilityWeekQueryDto } from '../availability/dto/availability-week-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import type { EmployeeResponseDto } from './dto/employee-response.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    return this.employeesService.createEmployee(dto);
  }

  @Get(':employeeId')
  getById(
    @Param('employeeId') employeeId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.getEmployeeById(employeeId, authUser);
  }

  @Get(':employeeId/availability')
  getAvailability(
    @Param('employeeId') employeeId: string,
    @Query() query: AvailabilityWeekQueryDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    return this.availabilityService.getEmployeeAvailability(employeeId, query, authUser);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  list(@Query() query: ListEmployeesQueryDto): Promise<EmployeeResponseDto[]> {
    return this.employeesService.listEmployees(query);
  }

  @Put(':employeeId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeesService.updateEmployee(employeeId, dto);
  }

  @Patch(':employeeId/deactivate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deactivate(@Param('employeeId') employeeId: string): Promise<EmployeeResponseDto> {
    return this.employeesService.deactivateEmployee(employeeId);
  }
}
