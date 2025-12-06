import { Injectable } from '@nestjs/common';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createQueueDto: CreateQueueDto) {
    const lastInQueue = await this.prisma.queue.findFirst({
      orderBy: {
        position: 'desc',
      },
    });

    const nextPosition = (lastInQueue?.position || 0) + 1;

    return this.prisma.queue.create({
      data: {
        ...createQueueDto,
        position: nextPosition,
      },
    });
  }

  findAll() {
    return this.prisma.queue.findMany({
      orderBy: {
        position: 'asc',
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
