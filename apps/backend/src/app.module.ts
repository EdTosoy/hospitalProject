import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { QueueModule } from './queue/queue.module';
import { BillingModule } from './billing/billing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConsultNotesModule } from './consult-notes/consult-notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PatientsModule,
    UsersModule,
    AppointmentsModule,
    QueueModule,
    BillingModule,
    PrismaModule,
    ConsultNotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
