import { Injectable } from '@nestjs/common';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQueueDto: CreateQueueDto) {
    const lastInQueue = await this.prisma.queue.findFirst({
      orderBy: {
        queueNumber: 'desc',
      },
    });

    const nextPosition = (lastInQueue?.queueNumber || 0) + 1;

    return this.prisma.queue.create({
      data: {
        ...createQueueDto,
        queueNumber: nextPosition,
      },
    });
  }

  async callNext() {
    const next = await this.prisma.queue.findFirst({
      where: {
        status: QueueStatus.WAITING,
      },
      orderBy: {
        queueNumber: 'asc',
      },
    });

    if (!next) return null;
    return this.prisma.queue.update({
      where: { id: next?.id },
      data: {
        status: QueueStatus.IN_PROGRESS,
        calledAt: new Date(),
      },
      include: {
        patient: true,
      },
    });
  }

  async complete(id: string) {
    return this.prisma.queue.update({
      where: { id },
      data: { status: QueueStatus.COMPLETED },
    });
  }

  async addToQueue(patientId: string, notes?: string) {
    const lastInQueue = await this.prisma.queue.findFirst({
      orderBy: {
        queueNumber: 'desc',
      },
    });

    const nextNumber = (lastInQueue?.queueNumber || 0) + 1;
    return this.prisma.queue.create({
      data: {
        patientId,
        queueNumber: nextNumber,
        status: QueueStatus.WAITING,
        notes,
      },
      include: {
        patient: true,
      },
    });
  }

  findAll() {
    return this.prisma.queue.findMany({
      orderBy: {
        queueNumber: 'asc',
      },
      include: {
        patient: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.queue.findUnique({
      where: { id },
    });
  }

  update(id: string, updateQueueDto: UpdateQueueDto) {
    return this.prisma.queue.update({
      where: { id },
      data: updateQueueDto,
    });
  }

  remove(id: string) {
    return this.prisma.queue.delete({ where: { id } });
  }
}
