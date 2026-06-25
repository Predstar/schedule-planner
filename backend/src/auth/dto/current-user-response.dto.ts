import type { SystemRole } from '../auth.constants';

export class CurrentUserResponseDto {
  id!: string;
  email!: string;
  systemRole!: SystemRole;
  employeeId!: string | null;
}
