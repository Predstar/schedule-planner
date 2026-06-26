import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AppException } from '../../shared/exceptions/app.exception';
import { ShiftsController } from '../shifts.controller';
import { ShiftsService } from '../shifts.service';

function createContext(handler: Function, systemRole?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ShiftsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: systemRole ? { systemRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Shifts authorization', () => {
  const guard = new RolesGuard(new Reflector());
  const controller = new ShiftsController({} as ShiftsService);

  it('allows ADMIN creating shifts', () => {
    expect(guard.canActivate(createContext(controller.create, 'ADMIN'))).toBe(true);
  });

  it('allows MANAGER listing shifts', () => {
    expect(guard.canActivate(createContext(controller.list, 'MANAGER'))).toBe(true);
  });

  it('denies EMPLOYEE deleting shifts', () => {
    try {
      guard.canActivate(createContext(controller.remove, 'EMPLOYEE'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });
});
