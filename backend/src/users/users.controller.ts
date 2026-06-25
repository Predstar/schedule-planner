import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEmployeeUserDto } from './dto/create-employee-user.dto';
import { CreateManagerUserDto } from './dto/create-manager-user.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('managers')
  @Roles('ADMIN')
  createManager(@Body() dto: CreateManagerUserDto): Promise<UserResponseDto> {
    return this.usersService.createManagerAccount(dto);
  }

  @Post('employees')
  @Roles('ADMIN', 'MANAGER')
  createEmployee(@Body() dto: CreateEmployeeUserDto): Promise<UserResponseDto> {
    return this.usersService.createEmployeeAccount(dto);
  }
}
