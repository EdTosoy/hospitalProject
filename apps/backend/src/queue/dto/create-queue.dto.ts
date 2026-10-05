import { IsOptional, IsNotEmpty, IsString } from 'class-validator';

export class CreateQueueDto {
  @IsNotEmpty()
  @IsString()
  patientId!: string;
  @IsOptional()
  @IsString()
  notes?: string;
}
