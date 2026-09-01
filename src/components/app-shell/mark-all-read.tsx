'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/notifications/read-all', { method: 'POST' });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      Mark all as read
    </Button>
  );
}
