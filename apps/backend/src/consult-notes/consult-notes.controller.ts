import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ConsultNotesService } from './consult-notes.service';
import { CreateConsultNoteDto } from './dto/create-consult-note.dto';
import { UpdateConsultNoteDto } from './dto/update-consult-note.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorators';
import { Role } from '@prisma/client';

@Controller('consult-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultNotesController {
  constructor(private readonly consultNotesService: ConsultNotesService) {}

  @Post()
  @Roles(Role.DOCTOR)
  create(@Body() createConsultNoteDto: CreateConsultNoteDto) {
    return this.consultNotesService.create(createConsultNoteDto);
  }

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.ADMIN)
  findAll() {
    return this.consultNotesService.findAll();
  }

  @Get('patient/:patientId')
  @Roles(Role.DOCTOR, Role.NURSE)
  findByPatient(@Param('patientId') patientId: string) {
    return this.consultNotesService.findByPatient(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consultNotesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR)
  update(
    @Param('id') id: string,
    @Body() updateConsultNoteDto: UpdateConsultNoteDto,
  ) {
    return this.consultNotesService.update(id, updateConsultNoteDto);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.consultNotesService.remove(id);
  }
}
