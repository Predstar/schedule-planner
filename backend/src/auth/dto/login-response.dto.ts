import type { SystemRole } from '../auth.constants';

class LoginUserDto {
  id!: string;
  email!: string;
  systemRole!: SystemRole;
  employeeId!: string | null;
}

export class LoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  user!: LoginUserDto;
}
