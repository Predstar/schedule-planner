import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AppException } from '../../shared/exceptions/app.exception';
import { SchedulesController } from '../schedules.controller';
import { SchedulesService } from '../schedules.service';

function createContext(handler: Function, systemRole?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => SchedulesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: systemRole ? { systemRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Schedules authorization', () => {
  const guard = new RolesGuard(new Reflector());
  const controller = new SchedulesController({} as SchedulesService);

  it('allows ADMIN creating schedules', () => {
    expect(guard.canActivate(createContext(controller.create, 'ADMIN'))).toBe(true);
  });

  it('allows MANAGER editing draft assignments', () => {
    expect(guard.canActivate(createContext(controller.addAssignment, 'MANAGER'))).toBe(true);
    expect(guard.canActivate(createContext(controller.removeAssignment, 'MANAGER'))).toBe(true);
    expect(guard.canActivate(createContext(controller.replaceAssignment, 'MANAGER'))).toBe(true);
  });

  it('allows ADMIN and MANAGER lifecycle transitions', () => {
    expect(guard.canActivate(createContext(controller.approve, 'ADMIN'))).toBe(true);
    expect(guard.canActivate(createContext(controller.reject, 'MANAGER'))).toBe(true);
    expect(guard.canActivate(createContext(controller.publish, 'ADMIN'))).toBe(true);
  });

  it('allows EMPLOYEE only for my-role', () => {
    expect(guard.canActivate(createContext(controller.getMyRoleSchedule, 'EMPLOYEE'))).toBe(true);
  });

  it('denies EMPLOYEE for every skeleton endpoint', () => {
    for (const handler of [
      controller.create,
      controller.getWeeklySchedule,
      controller.addAssignment,
      controller.removeAssignment,
      controller.replaceAssignment,
      controller.approve,
      controller.reject,
      controller.publish,
    ]) {
      try {
        guard.canActivate(createContext(handler, 'EMPLOYEE'));
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).code).toBe('ACCESS_DENIED');
        continue;
      }

      throw new Error('Expected ACCESS_DENIED');
    }
  });

  it('denies ADMIN and MANAGER for my-role', () => {
    for (const role of ['ADMIN', 'MANAGER'] as const) {
      try {
        guard.canActivate(createContext(controller.getMyRoleSchedule, role));
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).code).toBe('ACCESS_DENIED');
        continue;
      }

      throw new Error('Expected ACCESS_DENIED');
    }
  });
});
