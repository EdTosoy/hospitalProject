import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { UsersService } from '../../users/users.service';
import { DatabaseService } from '../../database/database.service';
import { sessions } from '../../database/schema';
import { sessionCookie, requireBrowserOrigin } from '../session';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly users: UsersService,
    private readonly database: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        sessionCookie,
      ]),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }
  async validate(request: Request, payload: { sub: string; sid?: string }) {
    if (!payload.sid) throw new UnauthorizedException();
    if (
      !ExtractJwt.fromAuthHeaderAsBearerToken()(request) &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    )
      requireBrowserOrigin(request);
    const session = await this.database.db.query.sessions.findFirst({
      where: eq(sessions.id, payload.sid),
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException();
    const user = await this.users.findOneById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    };
  }
}
