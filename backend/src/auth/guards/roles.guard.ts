import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../shared/exceptions/app.exception';
import type { SystemRole } from '../auth.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUserPayload } from '../types/auth-user-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUserPayload }>();

    if (!request.user || !requiredRoles.includes(request.user.systemRole)) {
      throw new AppException(403, 'ACCESS_DENIED', 'Access denied');
    }

    return true;
  }
}
