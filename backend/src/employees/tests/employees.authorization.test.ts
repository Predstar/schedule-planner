import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AvailabilityService } from '../../availability/availability.service';
import { AppException } from '../../shared/exceptions/app.exception';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmployeesController } from '../employees.controller';
import { EmployeesService } from '../employees.service';

function createContext(handler: Function, systemRole?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => EmployeesController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: systemRole ? { systemRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Employees authorization', () => {
  const guard = new RolesGuard(new Reflector());
  const controller = new EmployeesController(
    {} as EmployeesService,
    {} as AvailabilityService,
  );

  it('EMPLOYEE cannot create employee profile', () => {
    try {
      guard.canActivate(createContext(controller.create, 'EMPLOYEE'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('MANAGER cannot create employee profile', () => {
    try {
      guard.canActivate(createContext(controller.create, 'MANAGER'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('ADMIN can create employee profile', () => {
    expect(guard.canActivate(createContext(controller.create, 'ADMIN'))).toBe(true);
  });

  it('MANAGER cannot update employee profile', () => {
    try {
      guard.canActivate(createContext(controller.update, 'MANAGER'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('MANAGER cannot deactivate employee profile', () => {
    try {
      guard.canActivate(createContext(controller.deactivate, 'MANAGER'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('MANAGER can still list employees (read-only access retained)', () => {
    expect(guard.canActivate(createContext(controller.list, 'MANAGER'))).toBe(true);
  });
});
