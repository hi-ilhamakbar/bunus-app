import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../common/app-exception';
import { toCustomerProfile, type CustomerProfile } from '../customers/customer-profile';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeEmail } from './identity';
import { PasswordService } from './password.service';
import { SessionService, type CreatedSession } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async login(
    input: { email: string; password: string },
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ customer: CustomerProfile; session: CreatedSession }> {
    const identity = await this.prisma.customerIdentity.findUnique({
      where: { type_value: { type: 'EMAIL', value: normalizeEmail(input.email) } },
      include: { customer: { include: { identities: true } } },
    });
    const customer = identity?.customer;

    if (!customer) {
      await this.passwords.verifyAgainstDummy(input.password);
      throw this.invalidCredentials();
    }
    const passwordOk = await this.passwords.verify(customer.passwordHash, input.password);
    if (!passwordOk || customer.status !== 'ACTIVE') throw this.invalidCredentials();

    const session = await this.sessions.createForCustomer(customer.id, meta);
    return { customer: toCustomerProfile(customer), session };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.sessions.revoke(token);
  }

  private invalidCredentials(): AppException {
    return new AppException(
      'INVALID_CREDENTIALS',
      'The email or password is wrong. Check them and try again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
