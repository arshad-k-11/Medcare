'use client';

import { useState } from 'react';
import { Button, Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/utils';

type Preference = { type: string; channel: string; enabled: boolean };

/**
 * Per-type, per-channel notification preferences.
 *
 * In-app is not switchable: it is the record of what was sent, and a family should always
 * be able to see what happened even if they have turned off every outbound channel.
 * Channels without a configured provider are shown disabled with the reason rather than
 * silently accepting a preference that cannot be honoured.
 */
export function NotificationPreferences({
  types,
  channels,
  current,
}: {
  types: { type: string; label: string }[];
  channels: { channel: string; label: string; available: boolean }[];
  current: Preference[];
}) {
  const [prefs, setPrefs] = useState<Preference[]>(current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isEnabled = (type: string, channel: string) => {
    const found = prefs.find((p) => p.type === type && p.channel === channel);
    // Default on: a family should get visit updates without opting in first.
    return found ? found.enabled : channel === 'IN_APP';
  };

  function toggle(type: string, channel: string) {
    setPrefs((current) => {
      const existing = current.find((p) => p.type === type && p.channel === channel);
      if (existing) {
        return current.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled: !p.enabled } : p,
        );
      }
      return [...current, { type, channel, enabled: !isEnabled(type, channel) }];
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      setMessage(response.ok ? 'Preferences saved.' : 'We could not save those. Please try again.');
    } catch {
      setMessage('We could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="How we contact you"
        description="In-app messages are always kept, so there is always a record of what we sent."
      />
      <div className="table-scroll px-5 py-4">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Notification preferences by type and channel</caption>
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              <th scope="col" className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                Notification
              </th>
              {channels.map((channel) => (
                <th
                  key={channel.channel}
                  scope="col"
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500"
                >
                  {channel.label}
                  {!channel.available && channel.channel !== 'IN_APP' ? (
                    <span className="mt-0.5 block font-normal normal-case text-ink-400">
                      not configured
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {types.map((type) => (
              <tr key={type.type}>
                <th scope="row" className="py-3 text-left font-medium text-ink-800">
                  {type.label}
                </th>
                {channels.map((channel) => {
                  const locked = channel.channel === 'IN_APP';
                  const on = isEnabled(type.type, channel.channel);
                  return (
                    <td key={channel.channel} className="px-2 py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={locked ? true : on}
                        aria-label={`${type.label} by ${channel.label}`}
                        disabled={locked}
                        onClick={() => toggle(type.type, channel.channel)}
                        className={cn(
                          'inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          locked
                            ? 'cursor-not-allowed bg-brand-300'
                            : on
                              ? 'bg-brand-700'
                              : 'bg-ink-200',
                        )}
                      >
                        <span
                          className={cn(
                            'ml-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                            (locked || on) && 'translate-x-5',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] px-5 py-4">
        <Button onClick={save} loading={saving}>
          Save preferences
        </Button>
        {message ? <span className="text-sm text-ink-600">{message}</span> : null}
      </div>
    </Card>
  );
}
