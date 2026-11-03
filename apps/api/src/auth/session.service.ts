import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export interface SessionCustomer {
  id: string;
  displayName: string;
}

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/**
 * Opaque random session tokens. Only the SHA-256 hash is stored, so a database leak does not hand out
 * usable sessions. The token travels in an HttpOnly cookie, never in localStorage.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async createForCustomer(
    customerId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.session.ttlDays * 24 * 60 * 60 * 1000);
    await this.prisma.session.create({
      data: {
        tokenHash: sha256(token),
        customerId,
        expiresAt,
        ip: meta.ip?.slice(0, 64),
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    return { token, expiresAt };
  }

  async resolveCustomer(token: string): Promise<SessionCustomer | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    if (!session.customer || session.customer.status !== 'ACTIVE') return null;
    return { id: session.customer.id, displayName: session.customer.displayName };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
