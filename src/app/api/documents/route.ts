import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  parseQuery,
  requireCapability,
  zodToApiError,
} from '@/lib/api';
import { documentMetaSchema } from '@/lib/validation/business';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { MAX_FILE_BYTES, storage, storageKey, validateUpload } from '@/lib/integrations/storage';
import { audit } from '@/lib/audit';

const listQuery = z.object({
  seniorId: z.string().optional(),
  category: z.string().optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('document:read');
  const query = parseQuery(request, listQuery);
  const scope = await seniorIdWhere(user);

  const documents = await prisma.document.findMany({
    where: {
      ...scope,
      ...(query.seniorId ? { seniorId: query.seniorId } : {}),
      ...(query.category ? { category: query.category } : {}),
      archivedAt: null,
      // Restricted documents (internal reviews) are invisible to families and seniors.
      ...(user.role === 'FAMILY' || user.role === 'SENIOR' ? { isRestricted: false } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploadedBy: { select: { name: true } },
      senior: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok({ data: documents });
});

/**
 * POST /api/documents — multipart upload.
 *
 * Patient documents are the most sensitive data the platform holds, so this route does the
 * unglamorous work properly:
 *  * size, MIME, extension and magic-byte validation before anything is written;
 *  * an opaque storage key that carries no patient identity;
 *  * storage outside the web root, so there is no URL that serves the file without an
 *    authorisation check;
 *  * the original filename is never used as a path component.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('document:write');
  await enforceRateLimit('write', user.id, request);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('VALIDATION_ERROR', 'Expected a file upload.');
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new ApiError('VALIDATION_ERROR', 'Please choose a file to upload.', {
      file: 'Required',
    });
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new ApiError('VALIDATION_ERROR', 'Files must be 15 MB or smaller.', {
      file: 'That file is too large',
    });
  }

  const parsed = documentMetaSchema.safeParse({
    seniorId: form.get('seniorId'),
    category: form.get('category'),
    label: form.get('label'),
    isRestricted: form.get('isRestricted') === 'true',
  });
  if (!parsed.success) throw zodToApiError(parsed.error);
  const meta = parsed.data;

  if (!(await canAccessSenior(user, meta.seniorId))) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'document.upload.denied',
      entity: 'Senior',
      entityId: meta.seniorId,
      outcome: 'DENIED',
    });
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateUpload({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
    head: new Uint8Array(buffer.subarray(0, 16)),
  });

  if (!validation.ok) {
    throw new ApiError('VALIDATION_ERROR', validation.reason, { file: validation.reason });
  }

  const key = storageKey(meta.seniorId, validation.extension);
  await storage().put(key, buffer, file.type);

  const document = await prisma.document.create({
    data: {
      seniorId: meta.seniorId,
      category: meta.category,
      label: meta.label,
      storageKey: key,
      mimeType: file.type,
      sizeBytes: buffer.byteLength,
      // A family cannot mark something restricted; that is an internal classification.
      isRestricted: ['ADMIN', 'OPS_MANAGER', 'NURSE'].includes(user.role)
        ? meta.isRestricted
        : false,
      uploadedByUserId: user.id,
    },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'document.uploaded',
    entity: 'Document',
    entityId: document.id,
    seniorId: meta.seniorId,
    // Category and size only. The label can contain clinical detail.
    metadata: { category: meta.category, sizeBytes: buffer.byteLength },
  });

  return created({ id: document.id });
});
