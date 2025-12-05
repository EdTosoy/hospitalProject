import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PrismaService } from 'src/prisma/prisma.service';


@Module({
  controllers: [PostsController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PostsModule { }
