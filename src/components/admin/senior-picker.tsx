'use client';

import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui';

/** Chooses which patient the replacement matcher is working on, via the URL. */
export function SeniorPicker({
  seniors,
  selectedId,
}: {
  seniors: { id: string; label: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <>
      <label htmlFor="senior-picker" className="text-sm font-semibold text-ink-800">
        Patient
      </label>
      <Select
        id="senior-picker"
        className="mt-1.5"
        value={selectedId}
        onChange={(event) => {
          const value = event.target.value;
          router.push(value ? `/app/admin/assignments?senior=${value}` : '/app/admin/assignments');
        }}
      >
        <option value="">Select a patient…</option>
        {seniors.map((senior) => (
          <option key={senior.id} value={senior.id}>
            {senior.label}
          </option>
        ))}
      </Select>
    </>
  );
}
