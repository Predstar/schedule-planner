import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { BERLIN_TIMEZONE } from '../availability/availability.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { AddAssignmentDto } from './dto/add-assignment.dto';
import type { CreateScheduleDto } from './dto/create-schedule.dto';
import type { GetScheduleQueryDto } from './dto/get-schedule-query.dto';
import type { GetMyRoleScheduleResponseDto } from './dto/get-my-role-schedule-response.dto';
import type { RejectScheduleDto } from './dto/reject-schedule.dto';
import type { ReplaceAssignmentDto } from './dto/replace-assignment.dto';
import type { ScheduleResponseDto } from './dto/schedule-response.dto';

type AssignmentRecord = {
  id: string;
  shiftId: string;
  employeeId: string;
  shift: ShiftRecord;
  employee: { firstName: string; lastName: string };
};

type ScheduleRecord = {
  id: string;
  weekStartDate: Date;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  assignments: AssignmentRecord[];
};

type ShiftRecord = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  employeeRole: string;
  requiredCount: number;
};

type EmployeeRecord = {
  id: string;
  employeeRole: string;
  weeklyHourLimit: number;
  firstName?: string;
  lastName?: string;
};

function parseIsoDate(value: string): DateTime {
  const date = DateTime.fromISO(value, { zone: 'utc' });

  if (!date.isValid) {
    throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'weekStartDate', message: 'weekStartDate must be a valid ISO date' },
    ]);
  }

  return date.startOf('day');
}

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

function mapSchedule(raw: unknown): ScheduleResponseDto {
  const schedule = raw as ScheduleRecord;
  return {
    id: schedule.id,
    weekStartDate: formatIsoDate(schedule.weekStartDate),
    status: schedule.status,
    assignments: schedule.assignments.map((assignment) => ({
      assignmentId: assignment.id,
      shiftId: assignment.shiftId,
      employeeId: assignment.employeeId,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
      date: formatIsoDate(assignment.shift.date),
      startTime: assignment.shift.startTime,
      endTime: assignment.shift.endTime,
      employeeRole: assignment.shift.employeeRole as 'WAITER' | 'RUNNER' | 'BARTENDER',
    })),
  };
}

function mapMyRoleSchedule(schedule: {
  weekStartDate: Date;
  status: 'PUBLISHED';
  assignments: Array<{
    id: string;
    shiftId: string;
    employeeId: string;
    shift: ShiftRecord;
    employee: { firstName: string; lastName: string };
  }>;
}, employeeRole: string): GetMyRoleScheduleResponseDto {
  return {
    weekStartDate: formatIsoDate(schedule.weekStartDate),
    employeeRole: employeeRole as GetMyRoleScheduleResponseDto['employeeRole'],
    status: 'PUBLISHED',
    assignments: schedule.assignments.map((assignment) => ({
      assignmentId: assignment.id,
      shiftId: assignment.shiftId,
      employeeId: assignment.employeeId,
      employeeName: `${assignment.employee.firstName} ${assignment.employee.lastName}`,
      date: formatIsoDate(assignment.shift.date),
      startTime: assignment.shift.startTime,
      endTime: assignment.shift.endTime,
      employeeRole: assignment.shift.employeeRole as GetMyRoleScheduleResponseDto['employeeRole'],
    })),
  };
}

const ASSIGNMENT_INCLUDE = {
  assignments: {
    include: {
      shift: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

// ── Auto-generate solver ──────────────────────────────────────────────────
// Pure, DB-free scheduling solver so the backtracking search can run entirely
// in memory (no per-candidate round-trips) and be unit-tested directly.

export type SolverEmployee = {
  id: string;
  employeeRole: string;
  weeklyHourLimit: number;
  historicalMinutes: number; // minutes worked in the lookback window, before this week
  availability: Array<{ date: string; startTime: string; endTime: string; available: boolean; preferred: boolean }>;
};

export type SolverSlot = {
  date: string;
  role: string;
  startTime: string;
  endTime: string;
  // Distinguishes multiple concurrent seats of the same shift (e.g. "3 waiters
  // 09:00-15:00" is 3 slots with seat 0, 1, 2) so each can be filled/unfilled
  // independently instead of collapsing into a single slot key.
  seat?: number;
};

export type SolverAssignment = {
  slot: SolverSlot;
  employeeId: string;
};

export type SolverResult = {
  assignments: SolverAssignment[];
  unfilled: SolverSlot[];
};

function slotMinutes(slot: { startTime: string; endTime: string }): number {
  const [startHour, startMinute] = slot.startTime.split(':').map(Number);
  const [endHour, endMinute] = slot.endTime.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

function overlaps(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

// Bounds how much of the search tree we explore before giving up on finding a
// strictly-better solution and keeping the best one found so far.
const MAX_BACKTRACK_STEPS = 20_000;

/**
 * Assigns employees to shift slots, maximizing the number of filled slots.
 *
 * Fairness: among employees eligible for a slot, prefers whoever has the
 * lowest ratio of (hours worked historically + so far this week) to their
 * own weeklyHourLimit — so a part-timer near their cap doesn't get skipped
 * over just because their raw hour count is lower than a full-timer's.
 * Ties are broken in favor of employees who marked the slot `preferred`.
 *
 * Backtracking: slots are attempted in scarcity order (fewest eligible
 * candidates first, since those are most likely to become unfillable).
 * If committing to a candidate for the current slot makes a later slot
 * unfillable, the search backtracks and tries the next candidate — bounded
 * by MAX_BACKTRACK_STEPS so it can't blow up on pathological inputs.
 */
export function solveSchedule(employees: SolverEmployee[], slots: SolverSlot[]): SolverResult {
  const employeeById = new Map(employees.map(e => [e.id, e]));

  function isEligible(
    employee: SolverEmployee,
    slot: SolverSlot,
    assignedMinutes: Map<string, number>,
    dayShifts: Map<string, Array<{ startTime: string; endTime: string }>>,
  ): boolean {
    if (employee.employeeRole !== slot.role) return false;

    const entry = employee.availability.find(e =>
      e.date === slot.date && e.available && e.startTime <= slot.startTime && e.endTime >= slot.endTime,
    );
    if (!entry) return false;

    const used = assignedMinutes.get(employee.id) ?? 0;
    if ((used + slotMinutes(slot)) / 60 > employee.weeklyHourLimit) return false;

    const dayKey = `${employee.id}:${slot.date}`;
    const existing = dayShifts.get(dayKey) ?? [];
    if (existing.some(s => overlaps(s, slot))) return false;

    return true;
  }

  function fairnessScore(employee: SolverEmployee, assignedMinutes: Map<string, number>): number {
    const used = assignedMinutes.get(employee.id) ?? 0;
    const limitMinutes = employee.weeklyHourLimit * 60;
    if (limitMinutes <= 0) return Infinity;
    return (employee.historicalMinutes + used) / limitMinutes;
  }

  function rankCandidates(
    slot: SolverSlot,
    assignedMinutes: Map<string, number>,
    dayShifts: Map<string, Array<{ startTime: string; endTime: string }>>,
  ): SolverEmployee[] {
    const eligible = employees.filter(e => isEligible(e, slot, assignedMinutes, dayShifts));
    return eligible.sort((a, b) => {
      const scoreDiff = fairnessScore(a, assignedMinutes) - fairnessScore(b, assignedMinutes);
      if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;

      const aPreferred = a.availability.some(e => e.date === slot.date && e.preferred) ? 0 : 1;
      const bPreferred = b.availability.some(e => e.date === slot.date && e.preferred) ? 0 : 1;
      return aPreferred - bPreferred;
    });
  }

  // Order slots by scarcity (fewest currently-eligible candidates first) —
  // computed against the *initial* state, since it's only used to sequence
  // the search and doesn't need to be exact after assignments accumulate.
  const initialAssignedMinutes = new Map<string, number>(employees.map(e => [e.id, 0]));
  const initialDayShifts = new Map<string, Array<{ startTime: string; endTime: string }>>();
  const orderedSlots = [...slots].sort((a, b) => {
    const aCount = rankCandidates(a, initialAssignedMinutes, initialDayShifts).length;
    const bCount = rankCandidates(b, initialAssignedMinutes, initialDayShifts).length;
    return aCount - bCount;
  });

  let bestAssignments: SolverAssignment[] = [];
  let steps = 0;

  function search(
    index: number,
    assignedMinutes: Map<string, number>,
    dayShifts: Map<string, Array<{ startTime: string; endTime: string }>>,
    current: SolverAssignment[],
  ): void {
    if (current.length > bestAssignments.length) {
      bestAssignments = [...current];
    }

    if (index >= orderedSlots.length || steps >= MAX_BACKTRACK_STEPS) return;
    steps += 1;

    const slot = orderedSlots[index];
    const candidates = rankCandidates(slot, assignedMinutes, dayShifts);

    // Try assigning each candidate (best-fairness first), then recurse.
    for (const candidate of candidates) {
      const dayKey = `${candidate.id}:${slot.date}`;
      const nextAssignedMinutes = new Map(assignedMinutes);
      nextAssignedMinutes.set(candidate.id, (assignedMinutes.get(candidate.id) ?? 0) + slotMinutes(slot));
      const nextDayShifts = new Map(dayShifts);
      nextDayShifts.set(dayKey, [...(dayShifts.get(dayKey) ?? []), { startTime: slot.startTime, endTime: slot.endTime }]);

      search(index + 1, nextAssignedMinutes, nextDayShifts, [...current, { slot, employeeId: candidate.id }]);

      if (steps >= MAX_BACKTRACK_STEPS) return;
    }

    // Also try leaving this slot unfilled, in case skipping it allows more
    // total slots to be filled later (e.g. it frees up the only employee
    // who could cover a scarcer slot).
    search(index + 1, assignedMinutes, dayShifts, current);
  }

  search(0, initialAssignedMinutes, initialDayShifts, []);

  const filledSlotKeys = new Set(bestAssignments.map(a => `${a.slot.date}|${a.slot.role}|${a.slot.startTime}|${a.slot.endTime}|${a.slot.seat ?? 0}`));
  const unfilled = orderedSlots.filter(s => !filledSlotKeys.has(`${s.date}|${s.role}|${s.startTime}|${s.endTime}|${s.seat ?? 0}`));

  return { assignments: bestAssignments, unfilled };
}

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyEmployeesOfPublish(scheduleId: string, weekStartDate: string): Promise<void> {
    const assignments = await this.prismaService.scheduleAssignment.findMany({
      where: { scheduleId },
      select: { employee: { select: { user: { select: { id: true } } } } },
    });
    const userIds = assignments
      .map((a) => a.employee.user?.id)
      .filter((id): id is string => Boolean(id));
    await this.notificationsService.notifySchedulePublished(userIds, weekStartDate);
  }

  async createDraftSchedule(dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    const weekStartDate = parseIsoDate(dto.weekStartDate).toJSDate();

    const existingSchedule = await this.prismaService.schedule.findUnique({
      where: { weekStartDate },
      include: ASSIGNMENT_INCLUDE,
    });

    if (existingSchedule) {
      throw new AppException(409, 'SCHEDULE_ALREADY_EXISTS', 'Schedule already exists');
    }

    const schedule = await this.prismaService.schedule.create({
      data: {
        weekStartDate,
        status: 'DRAFT',
      },
      include: ASSIGNMENT_INCLUDE,
    });

    return mapSchedule(schedule);
  }

  async getWeeklySchedule(query: GetScheduleQueryDto): Promise<ScheduleResponseDto> {
    const schedule = await this.prismaService.schedule.findUnique({
      where: { weekStartDate: parseIsoDate(query.weekStartDate).toJSDate() },
      include: ASSIGNMENT_INCLUDE,
    });

    if (!schedule) {
      throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');
    }

    return mapSchedule(schedule);
  }

  async getMyRolePublishedSchedule(
    query: GetScheduleQueryDto,
    authUser: AuthUserPayload,
  ): Promise<GetMyRoleScheduleResponseDto> {
    if (authUser.systemRole !== 'EMPLOYEE' || !authUser.employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Access denied');
    }

    const employee = await this.getEmployeeById(authUser.employeeId);
    const schedule = await this.prismaService.schedule.findUnique({
      where: { weekStartDate: parseIsoDate(query.weekStartDate).toJSDate() },
      include: {
        assignments: {
          where: {
            shift: {
              employeeRole: employee.employeeRole as never,
            },
          },
          include: {
            shift: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!schedule || schedule.status !== 'PUBLISHED') {
      throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');
    }

    return mapMyRoleSchedule(
      schedule as {
        weekStartDate: Date;
        status: 'PUBLISHED';
        assignments: Array<{
          id: string;
          shiftId: string;
          employeeId: string;
          shift: ShiftRecord;
          employee: { firstName: string; lastName: string };
        }>;
      },
      employee.employeeRole,
    );
  }

  async addAssignment(
    scheduleId: string,
    dto: AddAssignmentDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);
    const shift = await this.getShiftById(dto.shiftId);
    const employee = await this.getEmployeeById(dto.employeeId);

    await this.ensureScheduleEditable(schedule);
    this.ensureEmployeeRoleMatchesShift(employee, shift);
    await this.ensureEmployeeAvailableForShift(employee.id, schedule.weekStartDate, shift);
    await this.ensureNoShiftOverlap(employee.id, schedule.id, shift);
    await this.ensureWeeklyHourLimitNotExceeded(employee, schedule.id, shift);

    const updatedSchedule = await this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.scheduleAssignment.create({
        data: {
          scheduleId: schedule.id,
          shiftId: dto.shiftId,
          employeeId: dto.employeeId,
        },
      });

      return tx.schedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: ASSIGNMENT_INCLUDE,
      });
    });

    return mapSchedule(updatedSchedule);
  }

  async removeAssignment(scheduleId: string, assignmentId: string): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);
    await this.ensureAssignmentExists(schedule.id, assignmentId);

    await this.ensureScheduleEditable(schedule);

    const updatedSchedule = await this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.scheduleAssignment.delete({
        where: { id: assignmentId },
      });

      return tx.schedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: ASSIGNMENT_INCLUDE,
      });
    });

    return mapSchedule(updatedSchedule);
  }

  async replaceAssignment(
    scheduleId: string,
    assignmentId: string,
    dto: ReplaceAssignmentDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);
    const assignment = await this.ensureAssignmentExists(schedule.id, assignmentId);
    const shift = await this.getShiftById(assignment.shiftId);
    const employee = await this.getEmployeeById(dto.employeeId);

    await this.ensureScheduleEditable(schedule);
    this.ensureEmployeeRoleMatchesShift(employee, shift);
    await this.ensureEmployeeAvailableForShift(employee.id, schedule.weekStartDate, shift);
    await this.ensureNoShiftOverlap(employee.id, schedule.id, shift, assignment.id);
    await this.ensureWeeklyHourLimitNotExceeded(employee, schedule.id, shift, assignment.id);

    const updatedSchedule = await this.prismaService.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.scheduleAssignment.update({
        where: { id: assignment.id },
        data: { employeeId: dto.employeeId },
      });

      return tx.schedule.findUniqueOrThrow({
        where: { id: schedule.id },
        include: ASSIGNMENT_INCLUDE,
      });
    });

    return mapSchedule(updatedSchedule);
  }

  // Reassigns a published shift to a new employee, e.g. when a manager
  // approves an open-shift claim. Unlike replaceAssignment, this does not
  // require the schedule to be in DRAFT — the schedule stays PUBLISHED
  // throughout, only the assignment's employeeId changes.
  async transferAssignmentForClaim(assignmentId: string, newEmployeeId: string): Promise<void> {
    const assignment = await this.prismaService.scheduleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new AppException(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    }

    const shift = await this.getShiftById(assignment.shiftId);
    const employee = await this.getEmployeeById(newEmployeeId);

    this.ensureEmployeeRoleMatchesShift(employee, shift);
    await this.ensureNoShiftOverlap(newEmployeeId, assignment.scheduleId, shift, assignment.id);
    await this.ensureWeeklyHourLimitNotExceeded(employee, assignment.scheduleId, shift, assignment.id);

    await this.prismaService.scheduleAssignment.update({
      where: { id: assignmentId },
      data: { employeeId: newEmployeeId },
    });
  }

  // Approving immediately publishes the schedule — employees can see their
  // shifts as soon as a manager approves, with no separate publish step.
  async approveSchedule(scheduleId: string): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);

    if (schedule.status !== 'DRAFT') {
      throw new AppException(
        409,
        'SCHEDULE_NOT_IN_DRAFT_STATUS',
        'Schedule not in draft status',
      );
    }

    const weekEnd = DateTime.fromJSDate(schedule.weekStartDate, { zone: BERLIN_TIMEZONE })
      .plus({ days: 6 })
      .endOf('day');
    if (DateTime.now().setZone(BERLIN_TIMEZONE) > weekEnd) {
      throw new AppException(
        409,
        'SCHEDULE_WEEK_IN_PAST',
        'Cannot approve a schedule for a week that has already ended',
      );
    }

    const updatedSchedule = await this.prismaService.schedule.update({
      where: { id: schedule.id },
      data: {
        status: 'PUBLISHED',
        rejectionReason: null,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    await this.notifyEmployeesOfPublish(schedule.id, formatIsoDate(updatedSchedule.weekStartDate));

    return mapSchedule(updatedSchedule);
  }

  async rejectSchedule(
    scheduleId: string,
    dto: RejectScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);

    if (schedule.status !== 'DRAFT' && schedule.status !== 'APPROVED') {
      throw new AppException(
        409,
        'SCHEDULE_NOT_EDITABLE',
        'Schedule not editable',
      );
    }

    const updatedSchedule = await this.prismaService.schedule.update({
      where: { id: schedule.id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    return mapSchedule(updatedSchedule);
  }

  async publishSchedule(scheduleId: string): Promise<ScheduleResponseDto> {
    const schedule = await this.getScheduleById(scheduleId);

    if (schedule.status !== 'APPROVED') {
      throw new AppException(409, 'SCHEDULE_NOT_APPROVED', 'Schedule not approved');
    }

    const updatedSchedule = await this.prismaService.schedule.update({
      where: { id: schedule.id },
      data: {
        status: 'PUBLISHED',
      },
      include: ASSIGNMENT_INCLUDE,
    });

    await this.notifyEmployeesOfPublish(schedule.id, formatIsoDate(updatedSchedule.weekStartDate));

    return mapSchedule(updatedSchedule);
  }

  private async getScheduleById(scheduleId: string) {
    const schedule = await this.prismaService.schedule.findUnique({
      where: { id: scheduleId },
      include: ASSIGNMENT_INCLUDE,
    });

    if (!schedule) {
      throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');
    }

    return schedule;
  }

  private async getShiftById(shiftId: string): Promise<ShiftRecord> {
    const shift = await this.prismaService.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new AppException(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    }

    return shift;
  }

  private async getEmployeeById(employeeId: string): Promise<EmployeeRecord> {
    const employee = await this.prismaService.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    return employee;
  }

  private async ensureAssignmentExists(scheduleId: string, assignmentId: string) {
    const assignment = await this.prismaService.scheduleAssignment.findFirst({
      where: {
        id: assignmentId,
        scheduleId,
      },
    });

    if (!assignment) {
      throw new AppException(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    }

    return assignment;
  }

  private async ensureScheduleEditable(schedule: { status: string }): Promise<void> {
    if (schedule.status !== 'DRAFT' && schedule.status !== 'REJECTED') {
      throw new AppException(409, 'SCHEDULE_NOT_EDITABLE', 'Schedule not editable');
    }
  }

  private ensureEmployeeRoleMatchesShift(employee: EmployeeRecord, shift: ShiftRecord): void {
    if (employee.employeeRole !== shift.employeeRole) {
      throw new AppException(409, 'EMPLOYEE_ROLE_MISMATCH', 'Employee role mismatch');
    }
  }

  private async ensureEmployeeAvailableForShift(
    employeeId: string,
    scheduleWeekStartDate: Date,
    shift: ShiftRecord,
  ): Promise<void> {
    const availability = await this.prismaService.availability.findUnique({
      where: {
        employeeId_weekStartDate: {
          employeeId,
          weekStartDate: scheduleWeekStartDate,
        },
      },
      include: { entries: true },
    });

    const shiftDate = formatIsoDate(shift.date);
    const hasCoveringEntry = availability?.status === 'SUBMITTED'
      && availability.entries.some(
        (entry: { date: Date; startTime: string; endTime: string; available: boolean }) =>
          formatIsoDate(entry.date) === shiftDate
          && entry.available
          && entry.startTime <= shift.startTime
          && entry.endTime >= shift.endTime,
      );

    if (!hasCoveringEntry) {
      throw new AppException(409, 'EMPLOYEE_UNAVAILABLE', 'Employee unavailable');
    }
  }

  private async ensureNoShiftOverlap(
    employeeId: string,
    scheduleId: string,
    shift: ShiftRecord,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    const assignments = await this.prismaService.scheduleAssignment.findMany({
      where: {
        scheduleId,
        employeeId,
        ...(ignoreAssignmentId ? { id: { not: ignoreAssignmentId } } : {}),
      },
      include: { shift: true },
    });

    const shiftDate = formatIsoDate(shift.date);
    const hasOverlap = assignments.some(
      (assignment: { shift: ShiftRecord }) =>
        formatIsoDate(assignment.shift.date) === shiftDate
        && assignment.shift.startTime < shift.endTime
        && shift.startTime < assignment.shift.endTime,
    );

    if (hasOverlap) {
      throw new AppException(409, 'SHIFT_OVERLAP', 'Shift overlap');
    }
  }

  private async ensureWeeklyHourLimitNotExceeded(
    employee: EmployeeRecord,
    scheduleId: string,
    shift: ShiftRecord,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    const assignments = await this.prismaService.scheduleAssignment.findMany({
      where: {
        scheduleId,
        employeeId: employee.id,
        ...(ignoreAssignmentId ? { id: { not: ignoreAssignmentId } } : {}),
      },
      include: { shift: true },
    });

    const assignedMinutes = assignments.reduce(
      (total: number, assignment: { shift: ShiftRecord }) =>
        total + this.calculateShiftMinutes(assignment.shift.startTime, assignment.shift.endTime),
      0,
    );
    const candidateMinutes = this.calculateShiftMinutes(shift.startTime, shift.endTime);
    const totalHours = (assignedMinutes + candidateMinutes) / 60;

    if (totalHours > employee.weeklyHourLimit) {
      throw new AppException(
        409,
        'WEEKLY_HOUR_LIMIT_EXCEEDED',
        'Weekly hour limit exceeded',
      );
    }
  }

  private calculateShiftMinutes(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return end - start;
  }

  // ── Auto-generate ─────────────────────────────────────────────────────────
  // Creates shifts for next week and assigns available employees using
  // solveSchedule (fairness by historical + this-week hours relative to each
  // employee's own weeklyHourLimit, with backtracking to maximize filled
  // slots). The schedule is created as DRAFT (manager can review before
  // publishing).
  async autoGenerateSchedule(weekStartDate: string, historyWeeks = 4): Promise<ScheduleResponseDto> {
    const weekStart = parseIsoDate(weekStartDate).toJSDate();

    // Re-use or create a DRAFT schedule
    let schedule = await this.prismaService.schedule.findUnique({
      where: { weekStartDate: weekStart },
      include: ASSIGNMENT_INCLUDE,
    });

    // If a published/approved schedule exists, delete it so we can regenerate
    if (schedule && schedule.status !== 'DRAFT' && schedule.status !== 'REJECTED') {
      await this.prismaService.scheduleAssignment.deleteMany({ where: { scheduleId: schedule.id } });
      await this.prismaService.schedule.delete({ where: { id: schedule.id } });
      schedule = null;
    }

    if (!schedule) {
      schedule = await this.prismaService.schedule.create({
        data: { weekStartDate: weekStart, status: 'DRAFT' },
        include: ASSIGNMENT_INCLUDE,
      });
    }

    // Clear any existing assignments so we can regenerate cleanly
    await this.prismaService.scheduleAssignment.deleteMany({
      where: { scheduleId: schedule.id },
    });

    // Load employees and their availability for this week
    const employees = await this.prismaService.employee.findMany({
      where: { active: true },
      include: {
        availabilities: {
          where: { weekStartDate: weekStart },
          include: { entries: true },
        },
      },
    });

    // Historical minutes worked per employee, from published/approved
    // schedules in the lookback window (used as the fairness baseline).
    const historyStart = new Date(weekStart.getTime() - historyWeeks * 7 * 86400000);
    const historicalAssignments = await this.prismaService.scheduleAssignment.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        schedule: {
          status: { in: ['APPROVED', 'PUBLISHED'] },
          weekStartDate: { gte: historyStart, lt: weekStart },
        },
      },
      include: { shift: true },
    });

    const historicalMinutesByEmployee = new Map<string, number>();
    for (const assignment of historicalAssignments as Array<{ employeeId: string; shift: ShiftRecord }>) {
      const minutes = this.calculateShiftMinutes(assignment.shift.startTime, assignment.shift.endTime);
      historicalMinutesByEmployee.set(
        assignment.employeeId,
        (historicalMinutesByEmployee.get(assignment.employeeId) ?? 0) + minutes,
      );
    }

    // Shift templates: role → {startTime, endTime, requiredCount}. requiredCount
    // is the target headcount for that shift (upper bound, where a range was
    // specified) — the solver tries to fill up to that many slots per shift.
    const shiftTemplates: { role: string; startTime: string; endTime: string; requiredCount: number }[] = [
      { role: 'WAITER',    startTime: '10:00', endTime: '17:00', requiredCount: 3 }, // morning
      { role: 'WAITER',    startTime: '17:00', endTime: '23:00', requiredCount: 6 }, // evening
      { role: 'RUNNER',    startTime: '12:00', endTime: '16:00', requiredCount: 3 }, // morning
      { role: 'RUNNER',    startTime: '18:00', endTime: '20:00', requiredCount: 4 }, // evening
      { role: 'BARTENDER', startTime: '10:00', endTime: '17:00', requiredCount: 1 }, // morning
      { role: 'BARTENDER', startTime: '16:30', endTime: '23:00', requiredCount: 3 }, // evening
    ];

    function addDays(d: Date, n: number): Date {
      return new Date(d.getTime() + n * 86400000);
    }

    const slots: SolverSlot[] = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateStr = formatIsoDate(addDays(weekStart, dayOffset));
      for (const template of shiftTemplates) {
        for (let seat = 0; seat < template.requiredCount; seat++) {
          slots.push({
            date: dateStr,
            role: template.role,
            startTime: template.startTime,
            endTime: template.endTime,
            seat,
          });
        }
      }
    }

    const solverEmployees: SolverEmployee[] = employees.map((emp: EmployeeRecord & {
      availabilities: Array<{ status: string; entries: Array<{ date: Date; startTime: string; endTime: string; available: boolean; preferred: boolean }> }>;
    }) => {
      const avail = emp.availabilities[0];
      const entries = avail && avail.status === 'SUBMITTED'
        ? avail.entries.map(e => ({
            date: formatIsoDate(e.date),
            startTime: e.startTime,
            endTime: e.endTime,
            available: e.available,
            preferred: e.preferred,
          }))
        : [];

      return {
        id: emp.id,
        employeeRole: emp.employeeRole,
        weeklyHourLimit: emp.weeklyHourLimit,
        historicalMinutes: historicalMinutesByEmployee.get(emp.id) ?? 0,
        availability: entries,
      };
    });

    const { assignments } = solveSchedule(solverEmployees, slots);

    for (const assignment of assignments) {
      const shift = await this.prismaService.shift.create({
        data: {
          date: new Date(`${assignment.slot.date}T00:00:00.000Z`),
          startTime: assignment.slot.startTime,
          endTime: assignment.slot.endTime,
          employeeRole: assignment.slot.role as never,
          requiredCount: 1,
        },
      });

      await this.prismaService.scheduleAssignment.create({
        data: { scheduleId: schedule.id, shiftId: shift.id, employeeId: assignment.employeeId },
      });
    }

    // Return the fully populated schedule
    const result = await this.prismaService.schedule.findUniqueOrThrow({
      where: { id: schedule.id },
      include: ASSIGNMENT_INCLUDE,
    });

    const managers = await this.prismaService.user.findMany({
      where: { systemRole: { in: ['ADMIN', 'MANAGER'] } },
      select: { id: true },
    });
    await this.notificationsService.notifyScheduleDraftGenerated(
      managers.map((m) => m.id),
      weekStartDate,
    );

    return mapSchedule(result);
  }
}
