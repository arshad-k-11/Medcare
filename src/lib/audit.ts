import { headers } from 'next/headers';
import { prisma } from './db';
import { hashIp } from './crypto';
import { clientIp } from './session';
import { log } from './log';
import { redact } from './log';

/**
 * Audit trail for sensitive actions.
 *
 * Records *that* something happened, by whom, and to which record — never the sensitive
 * value. Metadata passes through the same redaction as logging, so an accidental
 * `{ note: '...' }` cannot leak clinical text into the audit table.
 *
 * Writes are best-effort: an audit failure is logged loudly but must not fail the
 * user's request, because a family locked out of their parent's care timeline is a worse
 * outcome than a missing audit row. Regulated deployments should switch this to a
 * transactional write.
 */
export type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  seniorId?: string | null;
  outcome?: 'SUCCESS' | 'DENIED' | 'FAILURE';
  metadata?: Record<string, unknown>;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    const requestHeaders = await headers();
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        seniorId: input.seniorId ?? null,
        outcome: input.outcome ?? 'SUCCESS',
        ipHash: hashIp(clientIp(requestHeaders)),
        userAgent: requestHeaders.get('user-agent')?.slice(0, 250) ?? null,
        metadata: input.metadata ? JSON.stringify(redact(input.metadata)) : null,
      },
    });
  } catch (error) {
    log.error('audit.write.failed', { action: input.action, error: String(error) });
  }
}
