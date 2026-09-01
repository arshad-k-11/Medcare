'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui';

/**
 * Switches which senior a family surface is showing.
 *
 * Uses a query parameter rather than client state, so the selection survives a refresh and
 * can be linked to — a family with both parents on the platform will send "look at Appa's
 * page" to a sibling.
 */
export function SeniorSwitcher({
  seniors,
  selectedId,
}: {
  seniors: { id: string; firstName: string; lastName: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (seniors.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="senior-switcher" className="text-sm font-medium text-ink-600">
        Showing
      </label>
      <Select
        id="senior-switcher"
        value={selectedId}
        className="w-auto min-w-[12rem]"
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('senior', event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {seniors.map((senior) => (
          <option key={senior.id} value={senior.id}>
            {senior.firstName} {senior.lastName}
          </option>
        ))}
      </Select>
    </div>
  );
}
