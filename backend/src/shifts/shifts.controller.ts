import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Body() dto: CreateShiftDto): Promise<ShiftResponseDto> {
    return this.shiftsService.createShift(dto);
  }

  @Get()
  list(@Query() query: ListShiftsQueryDto): Promise<ShiftResponseDto[]> {
    return this.shiftsService.listShifts(query);
  }

  @Put(':shiftId')
  update(@Param('shiftId') shiftId: string, @Body() dto: UpdateShiftDto): Promise<ShiftResponseDto> {
    return this.shiftsService.updateShift(shiftId, dto);
  }

  @Delete(':shiftId')
  remove(@Param('shiftId') shiftId: string): Promise<void> {
    return this.shiftsService.deleteShift(shiftId);
  }
}
