import { Injectable, BadRequestException } from '@nestjs/common';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createPatientDto: CreatePatientDto) {
    const existingPatient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (existingPatient) {
      throw new BadRequestException(
        'Patient profile already exists for this user',
      );
    }

    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        dob: new Date(createPatientDto.dob).toISOString(),
        userId,
      },
    });
  }

  async registerWalkIn(createPatientDto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        dob: new Date(createPatientDto.dob).toISOString(),
      },
    });
  }
  findAll() {
    return this.prisma.patient.findMany();
  }

  findOne(id: string) {
    return this.prisma.patient.findUnique({ where: { id } });
  }

  update(id: string, updatePatientDto: UpdatePatientDto) {
    return this.prisma.patient.update({
      where: { id },
      data: updatePatientDto,
    });
  }

  remove(id: string) {
    return this.prisma.patient.delete({
      where: { id },
    });
  }
}
