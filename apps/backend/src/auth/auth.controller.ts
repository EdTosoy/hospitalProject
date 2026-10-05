import type { Response as ExpressResponse } from 'express';
import type { Request as ExpressRequest } from 'express';
import type { AuthenticatedRequest } from '../database/access';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SESSION_COOKIE, cookieOptions, requireBrowserOrigin } from './session';
import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../users/dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create({ ...createUserDto, role: 'PATIENT' });
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    requireBrowserOrigin(req, false);
    const result = await this.authService.login(loginUserDto);
    res.cookie(SESSION_COOKIE, result.access_token, cookieOptions());
    return result;
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: AuthenticatedRequest) {
    return this.usersService.findOneById(req.user.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.logout(req.user);
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
    return result;
  }
}
