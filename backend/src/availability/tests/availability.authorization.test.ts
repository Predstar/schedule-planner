import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AppException } from '../../shared/exceptions/app.exception';
import { AvailabilityController } from '../availability.controller';
import { AvailabilityService } from '../availability.service';

function createContext(handler: Function, systemRole?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AvailabilityController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: systemRole ? { systemRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Availability authorization', () => {
  const guard = new RolesGuard(new Reflector());
  const controller = new AvailabilityController({} as AvailabilityService);

  it('allows EMPLOYEE submitting availability', () => {
    expect(guard.canActivate(createContext(controller.submit, 'EMPLOYEE'))).toBe(true);
  });

  it('allows MANAGER submitting availability on behalf of an employee', () => {
    expect(guard.canActivate(createContext(controller.submit, 'MANAGER'))).toBe(true);
  });

  it('allows MANAGER listing weekly availability', () => {
    expect(guard.canActivate(createContext(controller.list, 'MANAGER'))).toBe(true);
  });

  it('denies EMPLOYEE listing weekly availability', () => {
    try {
      guard.canActivate(createContext(controller.list, 'EMPLOYEE'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });
});
