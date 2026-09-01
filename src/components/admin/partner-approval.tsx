'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button } from '@/components/ui';

/**
 * Approving a partner.
 *
 * The only route by which a partner account becomes usable — self-service registration
 * creates a pending one and cannot grant itself access.
 */
export function PartnerApproval({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function set(agreementStatus: 'ACTIVE' | 'PAUSED') {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementStatus }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? 'That could not be saved.');
        return;
      }
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <div className="flex gap-2">
        <Button size="sm" loading={busy} onClick={() => set('ACTIVE')}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => set('PAUSED')}>
          Decline
        </Button>
      </div>
      {error ? (
        <Alert tone="danger" className="mt-2 max-w-xs">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
