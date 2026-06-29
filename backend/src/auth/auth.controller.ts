import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import type { LoginResponseDto } from './dto/login-response.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUserPayload } from './types/auth-user-payload.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterRequestDto): Promise<LoginResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthUserPayload): Promise<CurrentUserResponseDto> {
    return this.authService.getCurrentUser(user);
  }
}
