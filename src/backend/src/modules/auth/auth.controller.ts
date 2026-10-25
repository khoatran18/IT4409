import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import type { AuthUser } from '../../common/types';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit('login')
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Public()
  @RateLimit('login')
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @HttpCode(204)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
