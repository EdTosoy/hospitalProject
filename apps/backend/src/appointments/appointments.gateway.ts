import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { sessions } from '../database/schema';
import { eq } from 'drizzle-orm';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3001'],
  },
})
export class AppointmentsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(
    private readonly jwt: JwtService,
    private readonly database: DatabaseService,
  ) {}
  async handleConnection(client: Socket) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid?: string }>(
        client.handshake.auth.token,
      );
      if (!payload.sid) {
        client.disconnect(true);
        return;
      }
      const session = await this.database.db.query.sessions.findFirst({
        where: eq(sessions.id, payload.sid),
      });
      if (
        !session ||
        session.userId !== payload.sub ||
        session.expiresAt <= new Date()
      )
        client.disconnect(true);
    } catch {
      client.disconnect(true);
    }
  }
  emitAppointmentUpdated() {
    this.server?.emit('appointment.updated', { refresh: true });
  }
}
