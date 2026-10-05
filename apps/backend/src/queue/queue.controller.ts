import type { AuthenticatedRequest } from '../database/access';
import {
  Controller,
  Request,
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
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorators';
import { Role } from '../database/schema';

@Roles('ADMIN', 'DOCTOR', 'NURSE', 'FRONT_DESK')
@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createQueueDto: CreateQueueDto,
  ) {
    return this.queueService.create(createQueueDto, req.user);
  }

  @Post('call-next')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  callNext(@Request() req: AuthenticatedRequest) {
    return this.queueService.callNext(req.user);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  complete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.queueService.complete(id, req.user);
  }

  @Post('add-to-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FRONT_DESK, Role.NURSE, Role.DOCTOR, Role.ADMIN)
  addToQueue(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateQueueDto,
  ) {
    return this.queueService.addToQueue(body.patientId, body.notes, req.user);
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
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateQueueDto: UpdateQueueDto,
  ) {
    return this.queueService.update(id, updateQueueDto, req.user);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.queueService.remove(id, req.user);
  }
}
