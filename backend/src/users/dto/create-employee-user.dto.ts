import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateEmployeeUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  employeeId!: string;
}
