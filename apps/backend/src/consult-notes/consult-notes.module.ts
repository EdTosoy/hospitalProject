import { Module } from '@nestjs/common';
import { ConsultNotesService } from './consult-notes.service';
import { ConsultNotesController } from './consult-notes.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ConsultNotesController],
  providers: [ConsultNotesService],
})
export class ConsultNotesModule {}
