import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserPayload } from '../types/auth-user-payload.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserPayload => {
    const request = context.switchToHttp().getRequest<{ user: AuthUserPayload }>();
    return request.user;
  },
);
