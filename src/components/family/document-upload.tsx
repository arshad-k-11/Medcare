'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Input, Select } from '@/components/ui';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, label } from '@/lib/constants';

export function DocumentUpload({ seniorId }: { seniorId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);
    setUploading(true);

    const form = new FormData(event.currentTarget);
    form.set('seniorId', seniorId);

    try {
      // Multipart, so the server can validate size, MIME and magic bytes before storing.
      const response = await fetch('/api/documents', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.fields
            ? Object.values(body.error.fields).join(' ')
            : (body?.error?.message ?? 'That file could not be uploaded.'),
        );
        return;
      }
      setDone(true);
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Upload a document" description="PDF or photo, up to 15 MB." />
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4 px-5 py-4">
        {error ? (
          <Alert tone="danger" title="Not uploaded">
            {error}
          </Alert>
        ) : null}
        {done ? <Alert tone="success">Uploaded and available to your care team.</Alert> : null}

        <Field label="What is it?" name="label" required>
          {({ id }) => (
            <Input id={id} name="label" required placeholder="e.g. Discharge summary, 12 March" />
          )}
        </Field>

        <Field label="Type" name="category">
          {({ id }) => (
            <Select id={id} name="category" defaultValue="DISCHARGE_SUMMARY">
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {label(DOCUMENT_CATEGORY_LABELS, option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="File" name="file" required>
          {({ id }) => (
            <input
              id={id}
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              required
              className="tap-target block w-full rounded-[10px] border border-ink-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800"
            />
          )}
        </Field>

        <Button type="submit" fullWidth loading={uploading}>
          Upload
        </Button>
      </form>
    </Card>
  );
}
