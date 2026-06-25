import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { RolesGuard } from '../../auth/guards/roles.guard';
// AppException used via cast below (thrown as AppException)
import { UsersController } from '../users.controller';

function createContext(handler: Function, systemRole?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => UsersController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: systemRole ? { systemRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Users authorization', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const managerHandler = UsersController.prototype.createManager;
  const employeeHandler = UsersController.prototype.createEmployee;

  it('allows ADMIN creating MANAGER', () => {
    expect(guard.canActivate(createContext(managerHandler, 'ADMIN'))).toBe(true);
  });

  it('denies MANAGER attempting to create MANAGER with 403 ACCESS_DENIED', () => {
    let thrown: unknown;
    try { guard.canActivate(createContext(managerHandler, 'MANAGER')); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).code).toBe('ACCESS_DENIED');
  });

  it('denies EMPLOYEE attempting to create MANAGER with 403 ACCESS_DENIED', () => {
    let thrown: unknown;
    try { guard.canActivate(createContext(managerHandler, 'EMPLOYEE')); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).code).toBe('ACCESS_DENIED');
  });

  it('denies EMPLOYEE attempting to create EMPLOYEE with 403 ACCESS_DENIED', () => {
    let thrown: unknown;
    try { guard.canActivate(createContext(employeeHandler, 'EMPLOYEE')); } catch (e) { thrown = e; }
    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).code).toBe('ACCESS_DENIED');
  });
});
