import type { SystemRole } from '../../auth/auth.constants';

export class UserResponseDto {
  id!: string;
  email!: string;
  systemRole!: SystemRole;
  employeeId?: string;
  active!: boolean;
}
