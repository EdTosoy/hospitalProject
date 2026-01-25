import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: createAppointmentDto.patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient record not found for this user');
    }

    const dateTime = new Date(createAppointmentDto.dateTime).toISOString();

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: createAppointmentDto.doctorId,
        dateTime,
        reason: createAppointmentDto.reason,
        status: createAppointmentDto.status || 'PENDING',
      },
    });

    return appointment;
  }

  findAll() {
    return this.prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });
  }

  update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    const dateTime = updateAppointmentDto.dateTime
      ? new Date(updateAppointmentDto.dateTime).toISOString()
      : undefined;

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...updateAppointmentDto,
        dateTime,
      },
    });
  }

  remove(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }
}
