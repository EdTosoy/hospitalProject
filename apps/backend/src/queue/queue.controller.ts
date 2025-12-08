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
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorators';
import { Role } from '@prisma/client';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  create(@Body() createQueueDto: CreateQueueDto) {
    return this.queueService.create(createQueueDto);
  }

  @Post('call-next')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  callNext() {
    return this.queueService.callNext();
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  complete(@Param('id') id: string) {
    return this.queueService.complete(id);
  }

  @Post('add-to-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  addToQueue(@Body() body: { patientId: string; notes?: string }) {
    return this.queueService.addToQueue(body.patientId, body.notes);
  }

  @Get()
  findAll() {
    return this.queueService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queueService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQueueDto: UpdateQueueDto) {
    return this.queueService.update(id, updateQueueDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.queueService.remove(id);
  }
}
