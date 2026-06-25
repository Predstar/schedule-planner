import type { SystemRole } from '../auth.constants';

class LoginUserDto {
  id!: string;
  email!: string;
  systemRole!: SystemRole;
}

export class LoginResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  user!: LoginUserDto;
}
