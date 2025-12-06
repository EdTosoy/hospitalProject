import { Injectable } from '@nestjs/common';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  create(createBillingDto: CreateBillingDto) {
    return this.prisma.billing.create({
      data: createBillingDto,
    });
  }

  findAll() {
    return this.prisma.billing.findMany({
      include: { patient: true },
    });
  }

  findOne(id: string) {
    return this.prisma.billing.findUnique({
      where: { id },
    });
  }

  update(id: string, updateBillingDto: UpdateBillingDto) {
    return this.prisma.billing.update({
      where: { id },
      data: updateBillingDto,
    });
  }

  remove(id: string) {
    return this.prisma.billing.delete({ where: { id } });
  }
}
