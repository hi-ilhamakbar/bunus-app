import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorType: 'CUSTOMER' | 'USER' | 'SYSTEM';
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  merchantId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string | null;
  ip?: string | null;
}

/**
 * Append-only audit trail. Pass a transaction client when the entry must commit or roll back
 * together with the change it describes.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<void> {
    await client.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        merchantId: entry.merchantId ?? null,
        before: entry.before,
        after: entry.after,
        reason: entry.reason ?? null,
        ip: entry.ip ?? null,
      },
    });
  }
}
