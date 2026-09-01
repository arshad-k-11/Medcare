import { prisma } from '@/lib/db';
import { created, enforceRateLimit, handler, parseBody } from '@/lib/api';
import { contactSchema } from '@/lib/validation/intake';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { writeList } from '@/lib/json-list';
import { log } from '@/lib/log';

/**
 * POST /api/public/contact
 *
 * A general message becomes a lead in the CRM rather than an email nobody owns — an
 * enquiry that lands in an inbox is an enquiry that gets lost. It is created with
 * urgency EXPLORING so it does not compete with real discharge cases in the queue.
 */
export const POST = handler(async (request) => {
  await enforceRateLimit('contact', null, request);
  const input = await parseBody(request, contactSchema);

  const source = await prisma.leadSource.findUnique({
    where: { key: 'WEBSITE' },
    select: { id: true },
  });

  const lead = await prisma.lead.create({
    data: {
      reference: reference('MC'),
      status: 'NEW',
      urgency: 'EXPLORING',
      contactName: input.name,
      contactPhone: input.phone,
      contactEmail: input.email ?? null,
      careNeedSummary: input.subject,
      situations: writeList([]),
      journey: 'FAMILY_LOCAL',
      sourceId: source?.id ?? null,
      notes: input.message,
      activities: {
        create: {
          type: 'NOTE',
          summary: `Contact form: ${input.subject}`,
          outcome: input.message.slice(0, 400),
          toStatus: 'NEW',
        },
      },
    },
    select: { id: true, reference: true },
  });

  await notifyInternal({
    type: 'LEAD_NEW',
    title: `Website message: ${input.subject}`,
    body: `${input.name} sent a message through the contact form. Reference ${lead.reference}.`,
    href: `/app/admin/leads/${lead.id}`,
  }).catch((error) => log.warn('contact.notify.failed', { error: String(error) }));

  await audit({
    action: 'contact.submitted',
    entity: 'Lead',
    entityId: lead.id,
    metadata: { subject: input.subject },
  });

  return created({ reference: lead.reference });
});
