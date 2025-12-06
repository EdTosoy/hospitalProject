import { Injectable, Post } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(createAppointmentDto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: createAppointmentDto
    })
  }

  findAll() {
    return this.prisma.appointment.findMany()
  }

  findOne(id: string) {
    return this.prisma.appointment.findUnique({ where: { id } })
  }

  update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    return this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto
    })
  }

  remove(id: string) {
    return this.prisma.appointment.delete({ where: { id } })
  }
}
