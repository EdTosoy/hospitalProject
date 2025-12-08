import { PartialType } from '@nestjs/swagger';
import { CreateQueueDto } from './create-queue.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { QueueStatus } from '@prisma/client';

export class UpdateQueueDto extends PartialType(CreateQueueDto) {
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;
}
