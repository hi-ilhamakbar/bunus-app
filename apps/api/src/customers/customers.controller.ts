import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AppException } from '../common/app-exception';
import { CurrentCustomer, CustomerSessionGuard } from '../auth/session.guard';
import type { SessionCustomer } from '../auth/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { toCustomerProfile, type CustomerProfile } from './customer-profile';

@Controller('customer')
@UseGuards(CustomerSessionGuard)
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentCustomer() current: SessionCustomer): Promise<{ customer: CustomerProfile }> {
    // Scoped by the id from the verified session, never by anything the browser sends.
    const customer = await this.prisma.customer.findUnique({
      where: { id: current.id },
      include: { identities: true },
    });
    if (!customer) {
      throw new AppException('UNAUTHENTICATED', 'Log in to continue.', HttpStatus.UNAUTHORIZED);
    }
    return { customer: toCustomerProfile(customer) };
  }
}
