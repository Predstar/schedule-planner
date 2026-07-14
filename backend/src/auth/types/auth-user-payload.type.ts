import type { SystemRole } from '../auth.constants';

export interface AuthUserPayload {
  id: string;
  email: string;
  systemRole: SystemRole;
  employeeId: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  systemRole: SystemRole;
  employeeId: string | null;
  sessionId: string;
}
