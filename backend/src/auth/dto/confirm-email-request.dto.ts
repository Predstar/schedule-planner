import { IsString, MinLength } from 'class-validator';

export class ConfirmEmailRequestDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
