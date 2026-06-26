import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AppException } from '../../shared/exceptions/app.exception';
import { RolesGuard } from '../../auth/guards/roles.guard';
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
    try {
      guard.canActivate(createContext(managerHandler, 'MANAGER'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('denies EMPLOYEE attempting to create MANAGER with 403 ACCESS_DENIED', () => {
    try {
      guard.canActivate(createContext(managerHandler, 'EMPLOYEE'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });

  it('denies EMPLOYEE attempting to create EMPLOYEE with 403 ACCESS_DENIED', () => {
    try {
      guard.canActivate(createContext(employeeHandler, 'EMPLOYEE'));
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('ACCESS_DENIED');
      return;
    }

    throw new Error('Expected ACCESS_DENIED');
  });
});
