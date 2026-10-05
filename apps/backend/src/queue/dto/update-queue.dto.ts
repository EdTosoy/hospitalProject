import { PartialType } from '@nestjs/swagger';
import { CreateQueueDto } from './create-queue.dto';
import { IsEnum, ValidateIf } from 'class-validator';
import { QueueStatus } from '../../database/schema';

export class UpdateQueueDto extends PartialType(CreateQueueDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(QueueStatus)
  status?: QueueStatus;
}
