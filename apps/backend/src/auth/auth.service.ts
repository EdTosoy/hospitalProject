import { DatabaseService } from '../database/database.service';
import { sessions } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import type { Actor } from '../database/access';
import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private database: DatabaseService,
  ) {}

  async login(loginDto: LoginUserDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(loginDto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    await this.database.audit(
      { userId: user.id, role: user.role, email: user.email },
      'Session',
      'LOGIN',
      [],
      async (tx) =>
        (
          await tx
            .insert(sessions)
            .values({
              id: sessionId,
              userId: user.id,
              expiresAt: new Date(Date.now() + 3600000),
            })
            .returning()
        )[0],
    );
    const payload = {
      sid: sessionId,
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }
  async logout(actor: Actor) {
    if (actor.sessionId)
      await this.database.audit(actor, 'Session', 'LOGOUT', [], async (tx) => {
        const [row] = await tx
          .delete(sessions)
          .where(
            and(
              eq(sessions.id, actor.sessionId!),
              eq(sessions.userId, actor.userId),
            ),
          )
          .returning();
        if (!row) throw new UnauthorizedException();
        return row;
      });
    return { success: true };
  }
}
