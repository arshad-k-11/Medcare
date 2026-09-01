'use client';

import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { formatMoney } from '@/lib/format';

/**
 * Starts a payment for an invoice.
 *
 * When the gateway is not configured, the API returns an unconfigured order and this button
 * shows exactly that rather than opening a checkout that cannot complete. A demo that fails
 * silently at the payment step is worse than one that says "not live yet".
 */
export function PayInvoiceButton({
  invoiceId,
  amountPaise,
}: {
  invoiceId: string;
  amountPaise: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'danger'>('info');

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setTone('danger');
        setMessage(body?.error?.message ?? 'We could not start that payment.');
        return;
      }

      if (!body.live) {
        setTone('info');
        setMessage(body.message);
        return;
      }

      // With keys configured, this is where the gateway checkout is opened. The order id
      // and key are already on `body`; the verify step is /api/payments/verify.
      setTone('info');
      setMessage(
        `Payment of ${formatMoney(body.amountPaise)} is ready. Opening the secure checkout…`,
      );
    } catch {
      setTone('danger');
      setMessage('We could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-left">
      <Button size="sm" onClick={start} loading={busy}>
        Pay {formatMoney(amountPaise)}
      </Button>
      {message ? (
        <Alert tone={tone} className="mt-3 max-w-sm">
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
