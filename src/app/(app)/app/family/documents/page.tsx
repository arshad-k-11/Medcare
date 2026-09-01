import type { Metadata } from 'next';
import { Alert, Card, CardHeader, EmptyState, PageHeader, Table, Td } from '@/components/ui';
import { DocumentUpload } from '@/components/family/document-upload';
import { SeniorSwitcher } from '@/components/family/senior-switcher';
import { requirePageUser } from '@/lib/auth-guard';
import { resolveSelectedSenior } from '@/lib/queries/family';
import { prisma } from '@/lib/db';
import { formatDate, formatName } from '@/lib/format';
import { DOCUMENT_CATEGORY_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Documents',
  robots: { index: false, follow: false },
};

/** Documents are never linked publicly — every open goes through the authorised handler. */
export default async function FamilyDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['FAMILY']);
  const params = await searchParams;
  const requested = typeof params.senior === 'string' ? params.senior : undefined;
  const { seniors, selectedId } = await resolveSelectedSenior(user, requested);

  if (!selectedId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Documents" />
        <Card>
          <EmptyState title="Nobody linked yet" description="Add a senior to upload documents." />
        </Card>
      </div>
    );
  }

  const senior = seniors.find((row) => row.id === selectedId)!;
  const documents = await prisma.document.findMany({
    where: { seniorId: senior.id, archivedAt: null, isRestricted: false },
    orderBy: { uploadedAt: 'desc' },
    include: { uploadedBy: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Documents"
        description={`Records for ${formatName(senior)}.`}
        action={
          <SeniorSwitcher
            seniors={seniors.map((row) => ({
              id: row.id,
              firstName: row.firstName,
              lastName: row.lastName,
            }))}
            selectedId={senior.id}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Uploaded documents" />
          {documents.length ? (
            <Table caption="Documents" head={['Document', 'Type', 'Uploaded', 'By']}>
              {documents.map((document) => (
                <tr key={document.id}>
                  <Td>
                    {/* Streams through an authorised, audited handler — never a public URL. */}
                    <a
                      href={`/api/documents/${document.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {document.label}
                    </a>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {(document.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </Td>
                  <Td>{label(DOCUMENT_CATEGORY_LABELS, document.category)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(document.uploadedAt)}</Td>
                  <Td>{document.uploadedBy.name}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState
              title="No documents yet"
              description="Upload the discharge summary and the current prescription — they make the assessment far more useful."
            />
          )}
        </Card>

        <div className="space-y-6">
          <DocumentUpload seniorId={senior.id} />

          <Card>
            <CardHeader title="How your documents are handled" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                Files are stored privately, never in a public folder, and there is no shareable
                link. Every time somebody opens one, the request is checked against their role and
                the specific patient, and the access is recorded.
              </p>
              <p className="mt-3">
                We accept PDF and image files up to 15 MB. Files are checked by content, not just by
                their name.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
