import { Module } from '@nestjs/common';
import { ConsultNotesService } from './consult-notes.service';
import { ConsultNotesController } from './consult-notes.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConsultNotesController],
  providers: [ConsultNotesService],
})
export class ConsultNotesModule {}
