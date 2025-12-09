import { PartialType } from '@nestjs/swagger';
import { CreateConsultNoteDto } from './create-consult-note.dto';

export class UpdateConsultNoteDto extends PartialType(CreateConsultNoteDto) {}
