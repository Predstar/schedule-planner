import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
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
  const controller = new EmployeesController({} as EmployeesService);

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
});
