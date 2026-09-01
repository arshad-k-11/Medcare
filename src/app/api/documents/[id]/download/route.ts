import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiError, handler, requireCapability, type RouteContext } from '@/lib/api';
import { canAccessSenior } from '@/lib/scope';
import { storage } from '@/lib/integrations/storage';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

/**
 * GET /api/documents/:id/download
 *
 * The only way to read a patient document. There is deliberately no public URL and no
 * signed-link shortcut: every read passes through this handler, is authorised against the
 * caller's patient scope, and is written to the audit log. That is what makes it possible
 * to answer "who opened my mother's discharge summary, and when".
 */
export const GET = handler<RouteContext<{ id: string }>>(async (_request, { params }) => {
  const user = await requireCapability('document:read');
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      seniorId: true,
      label: true,
      storageKey: true,
      mimeType: true,
      isRestricted: true,
      archivedAt: true,
      category: true,
    },
  });

  if (!document || document.archivedAt) {
    throw new ApiError('NOT_FOUND', 'That document could not be found.');
  }

  const allowed = await canAccessSenior(user, document.seniorId);
  const restrictedBlocked =
    document.isRestricted && !['ADMIN', 'OPS_MANAGER', 'NURSE'].includes(user.role);

  if (!allowed || restrictedBlocked) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'document.download.denied',
      entity: 'Document',
      entityId: id,
      seniorId: document.seniorId,
      outcome: 'DENIED',
    });
    // 404 rather than 403: confirming the document exists is itself a small leak.
    throw new ApiError('NOT_FOUND', 'That document could not be found.');
  }

  let body: Buffer;
  try {
    body = await storage().read(document.storageKey);
  } catch (error) {
    log.error('document.read.failed', { documentId: id, error: String(error) });
    throw new ApiError(
      'UNAVAILABLE',
      'We could not retrieve that file just now. Please try again, or contact us.',
    );
  }

  // Best-effort: an access-time update must not fail the download.
  prisma.document
    .update({ where: { id }, data: { lastAccessedAt: new Date() } })
    .catch(() => undefined);

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'document.downloaded',
    entity: 'Document',
    entityId: id,
    seniorId: document.seniorId,
    metadata: { category: document.category },
  });

  // Safe filename: derived from our own label, never from the uploaded filename.
  const safeName = `${document.label.replace(/[^a-zA-Z0-9 \-_.]/g, '')}`.trim() || 'document';

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': document.mimeType,
      // `inline` so a family can view a PDF without downloading it first.
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Content-Length': String(body.byteLength),
      // Never let a shared cache hold a patient document.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
