import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type StoredChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export interface PendingSignupRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  phone: string | null;
  channel: StoredChannel;
  destination: string;
  otpId: string | null;
  sendSeq: number;
  resendCount: number;
  lastSentAt: Date | null;
  wrongCodes: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface UpsertPendingInput {
  email: string;
  displayName: string;
  passwordHash: string;
  phone: string | null;
  channel: StoredChannel;
  destination: string;
  sendSeq: number;
  expiresAt: Date;
  ip?: string;
}

export interface CompleteSignupInput {
  pendingId: string;
  now: Date;
  displayName: string;
  passwordHash: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  ip?: string;
}

export interface CreatedCustomer {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

/** Raised by completeSignup when the same pending signup is submitted twice at once. */
export class SignupAlreadyConsumedError extends Error {}
/** Raised by completeSignup when the email or phone got registered while the signup was pending. */
export class AccountAlreadyExistsError extends Error {}

/**
 * Persistence for the signup flow. An abstract class so the flow can be unit-tested against an
 * in-memory implementation and the Prisma details stay in one place.
 */
export abstract class SignupStore {
  abstract hasAccountFor(email: string, phone: string | null): Promise<boolean>;
  abstract findByEmail(email: string): Promise<PendingSignupRecord | null>;
  abstract findById(id: string): Promise<PendingSignupRecord | null>;
  /** Latest code sent to this destination by a signup under a different email, since `since`. */
  abstract findRecentSendToOthers(destination: string, since: Date, exceptEmail: string): Promise<boolean>;
  abstract upsertPending(input: UpsertPendingInput): Promise<PendingSignupRecord>;
  abstract saveSent(
    id: string,
    data: { otpId: string; sentAt: Date; sendSeq: number; resendCount: number },
  ): Promise<void>;
  abstract incrementWrongCodes(id: string): Promise<number>;
  abstract completeSignup(input: CompleteSignupInput): Promise<CreatedCustomer>;
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';

@Injectable()
export class PrismaSignupStore extends SignupStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async hasAccountFor(email: string, phone: string | null): Promise<boolean> {
    const found = await this.prisma.customerIdentity.findFirst({
      where: {
        OR: [{ type: 'EMAIL', value: email }, ...(phone ? [{ type: 'PHONE' as const, value: phone }] : [])],
      },
      select: { id: true },
    });
    return found !== null;
  }

  findByEmail(email: string): Promise<PendingSignupRecord | null> {
    return this.prisma.pendingSignup.findUnique({ where: { email } });
  }

  findById(id: string): Promise<PendingSignupRecord | null> {
    return this.prisma.pendingSignup.findUnique({ where: { id } });
  }

  async findRecentSendToOthers(destination: string, since: Date, exceptEmail: string): Promise<boolean> {
    const found = await this.prisma.pendingSignup.findFirst({
      where: { destination, lastSentAt: { gt: since }, NOT: { email: exceptEmail } },
      select: { id: true },
    });
    return found !== null;
  }

  upsertPending(input: UpsertPendingInput): Promise<PendingSignupRecord> {
    const fields = {
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      phone: input.phone,
      channel: input.channel,
      destination: input.destination,
      sendSeq: input.sendSeq,
      resendCount: 0,
      wrongCodes: 0,
      otpId: null,
      lastSentAt: null,
      consumedAt: null,
      expiresAt: input.expiresAt,
      createdIp: input.ip?.slice(0, 64),
    };
    return this.prisma.pendingSignup.upsert({
      where: { email: input.email },
      create: { email: input.email, ...fields },
      update: fields,
    });
  }

  async saveSent(
    id: string,
    data: { otpId: string; sentAt: Date; sendSeq: number; resendCount: number },
  ): Promise<void> {
    await this.prisma.pendingSignup.update({
      where: { id },
      data: {
        otpId: data.otpId,
        lastSentAt: data.sentAt,
        sendSeq: data.sendSeq,
        resendCount: data.resendCount,
        wrongCodes: 0,
      },
    });
  }

  async incrementWrongCodes(id: string): Promise<number> {
    const row = await this.prisma.pendingSignup.update({
      where: { id },
      data: { wrongCodes: { increment: 1 } },
      select: { wrongCodes: true },
    });
    return row.wrongCodes;
  }

  async completeSignup(input: CompleteSignupInput): Promise<CreatedCustomer> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Claim the pending row first: of two simultaneous submits only one gets count === 1.
        const claimed = await tx.pendingSignup.updateMany({
          where: { id: input.pendingId, consumedAt: null },
          data: { consumedAt: input.now },
        });
        if (claimed.count !== 1) throw new SignupAlreadyConsumedError();

        const customer = await tx.customer.create({
          data: {
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            identities: {
              create: [
                {
                  type: 'EMAIL',
                  value: input.email,
                  verifiedAt: input.emailVerified ? input.now : null,
                },
                ...(input.phone
                  ? [
                      {
                        type: 'PHONE' as const,
                        value: input.phone,
                        verifiedAt: input.phoneVerified ? input.now : null,
                      },
                    ]
                  : []),
              ],
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: 'CUSTOMER',
            actorId: customer.id,
            action: 'customer.signup.completed',
            targetType: 'customer',
            targetId: customer.id,
            after: { emailVerified: input.emailVerified, phoneVerified: input.phoneVerified },
            ip: input.ip?.slice(0, 64),
          },
        });

        return {
          id: customer.id,
          displayName: customer.displayName,
          email: input.email,
          phone: input.phone,
          emailVerified: input.emailVerified,
          phoneVerified: input.phoneVerified,
        };
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new AccountAlreadyExistsError();
      throw err;
    }
  }
}
