// backend/src/posts/posts.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // ✅ YOUR service

@Controller('posts') // API endpoint: /posts
export class PostsController {
  constructor(private prisma: PrismaService) { }

  @Get() // GET /posts
  async findAll() {
    return this.prisma.post.findMany();
  }

  @Get(':id') // GET /posts/1
  async findOne(@Param('id') id: string) {
    return this.prisma.post.findUnique({
      where: { id: parseInt(id) },
    });
  }
}
