import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConsultNoteDto } from './dto/create-consult-note.dto';
import { UpdateConsultNoteDto } from './dto/update-consult-note.dto';

@Injectable()
export class ConsultNotesService {
  constructor(private prisma: PrismaService) {}

  create(createConsultNoteDto: CreateConsultNoteDto) {
    return this.prisma.consultNote.create({
      data: createConsultNoteDto,
    });
  }

  findAll() {
    return this.prisma.consultNote.findMany({
      include: { patient: true, doctor: true },
    });
  }

  findByPatient(patientId: string) {
    return this.prisma.consultNote.findMany({
      where: { patientId },
      include: { doctor: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.consultNote.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });
  }

  update(id: string, updateConsultNoteDto: UpdateConsultNoteDto) {
    return this.prisma.consultNote.update({
      where: { id },
      data: updateConsultNoteDto,
    });
  }

  remove(id: string) {
    return this.prisma.consultNote.delete({
      where: { id },
    });
  }
}
