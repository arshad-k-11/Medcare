import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { channelStatus } from '@/lib/integrations/notifications';
import { isPaymentsConfigured } from '@/lib/integrations/payments';
import { formatMoney } from '@/lib/format';
import { readList, readJson } from '@/lib/json-list';
import {
  CHANNEL_LABELS,
  ESCALATION_LEVEL_LABELS,
  SERVICE_CLASS_LABELS,
  label,
  titleise,
} from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Configuration',
  robots: { index: false, follow: false },
};

/**
 * Business configuration.
 *
 * Everything on this page is data the business changes without an engineer: packages,
 * services, rates, service areas, task templates, escalation rules, vitals bands,
 * notification templates and lead sources.
 *
 * This release exposes them read-only, with editing through the API. The page is explicit
 * about that rather than showing disabled buttons that imply otherwise.
 */
export default async function AdminSettingsPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const [
    packages,
    services,
    areas,
    taskTemplates,
    escalationRules,
    thresholds,
    templates,
    leadSources,
    settings,
  ] = await Promise.all([
    prisma.carePackage.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { services: true } } } }),
    prisma.service.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.serviceArea.findMany({ orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }] }),
    prisma.taskTemplate.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.escalationRule.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.vitalThreshold.findMany({ where: { seniorId: null }, orderBy: { type: 'asc' } }),
    prisma.notificationTemplate.findMany({ orderBy: { key: 'asc' } }),
    prisma.leadSource.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.appSetting.findMany(),
  ]);

  const channels = channelStatus();
  const legalStatus = settings.find((setting) => setting.key === 'legal.reviewStatus');

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="The business vocabulary, rates and rules — all editable without a deploy."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <Alert tone="info" title="How configuration works here" className="mb-6">
        <p>
          Packages, services, rates, areas, task templates, escalation rules, vitals bands,
          notification templates and lead sources are all stored as data rather than code, so the
          business changes them without an engineer. This release shows them read-only in the
          console; changes go through the configuration API. Editing screens are the next
          increment — we would rather say that than show buttons that do nothing.
        </p>
      </Alert>

      {legalStatus ? (
        <Alert tone="warning" title="Legal review status" className="mb-6">
          <p>{readJson<string>(legalStatus.value, '')}</p>
        </Alert>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Integration status"
            description="What is actually switched on right now."
          />
          <Table caption="Integrations" head={['Integration', 'Status', 'What it means']}>
            {channels.map((channel) => (
              <tr key={channel.channel}>
                <Td className="font-medium text-ink-900">
                  {label(CHANNEL_LABELS, channel.channel)} notifications
                </Td>
                <Td>
                  <Badge tone={channel.enabled ? 'success' : 'warning'}>
                    {channel.enabled ? 'Configured' : 'Not configured'}
                  </Badge>
                </Td>
                <Td className="text-ink-600">
                  {channel.channel === 'IN_APP'
                    ? 'Always available — the in-app record is the source of truth.'
                    : channel.enabled
                      ? 'Messages are delivered through the provider.'
                      : 'Messages are recorded and marked as not delivered, so nothing is lost silently.'}
                </Td>
              </tr>
            ))}
            <tr>
              <Td className="font-medium text-ink-900">Payment gateway</Td>
              <Td>
                <Badge tone={isPaymentsConfigured() ? 'success' : 'warning'}>
                  {isPaymentsConfigured() ? 'Configured' : 'Not configured'}
                </Badge>
              </Td>
              <Td className="text-ink-600">
                {isPaymentsConfigured()
                  ? 'Online checkout is live.'
                  : 'Invoices and reconciliation work; the checkout step does not.'}
              </Td>
            </tr>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Care packages" description={`${packages.length} configured`} />
          <Table caption="Packages" head={['Package', 'Audience', 'Duration', 'From', 'Services', 'Published']}>
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <Td>
                  <Link
                    href={`/care-packages/${pkg.slug}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {pkg.name}
                  </Link>
                </Td>
                <Td>{titleise(pkg.audience)}</Td>
                <Td>{pkg.durationLabel}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {pkg.priceFromPaise ? formatMoney(pkg.priceFromPaise) : 'Talk to us'}
                </Td>
                <Td>{pkg._count.services}</Td>
                <Td>
                  {pkg.isComingSoon ? (
                    <Badge tone="warning">Coming soon</Badge>
                  ) : pkg.isPublished ? (
                    <Badge tone="success">Published</Badge>
                  ) : (
                    <Badge tone="neutral">Hidden</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader title="Services and rates" description={`${services.length} configured`} />
          <Table caption="Services" head={['Service', 'Class', 'Unit', 'Rate', 'Skills needed', 'Active']}>
            {services.map((service) => (
              <tr key={service.id}>
                <Td className="font-medium text-ink-900">{service.name}</Td>
                <Td>
                  <Badge tone={service.serviceClass === 'NURSING' ? 'info' : 'neutral'}>
                    {label(SERVICE_CLASS_LABELS, service.serviceClass)}
                  </Badge>
                </Td>
                <Td>{titleise(service.unit)}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {service.basePricePaise ? formatMoney(service.basePricePaise) : '—'}
                </Td>
                <Td className="text-ink-600">
                  {readList(service.requiredSkills).map(titleise).join(', ') || '—'}
                </Td>
                <Td>
                  <Badge tone={service.isActive ? 'success' : 'neutral'}>
                    {service.isActive ? 'Active' : 'Off'}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Service areas"
            description="Turning an area off stops us accepting work there."
          />
          <Table caption="Service areas" head={['Area', 'Zone', 'Pincodes', 'Status', 'Note']}>
            {areas.map((area) => (
              <tr key={area.id}>
                <Td className="font-medium text-ink-900">{area.name}</Td>
                <Td>{titleise(area.zone)}</Td>
                <Td className="tabular-nums text-ink-600">
                  {readList(area.pincodes).join(', ') || '—'}
                </Td>
                <Td>
                  <Badge tone={area.isActive ? 'success' : 'warning'}>
                    {area.isActive ? 'Serving' : 'Not serving'}
                  </Badge>
                </Td>
                <Td className="text-ink-600">{area.notes ?? '—'}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Escalation rules"
            description="No rule contacts emergency services. That stays a human decision."
          />
          <Table caption="Escalation rules" head={['Trigger', 'Goes to', 'Family told', 'Within', 'Active']}>
            {escalationRules.map((rule) => (
              <tr key={rule.id}>
                <Td className="font-medium text-ink-900">{titleise(rule.trigger)}</Td>
                <Td>{label(ESCALATION_LEVEL_LABELS, rule.notifyLevel)}</Td>
                <Td>{rule.notifyFamily ? 'Yes' : 'Not automatically'}</Td>
                <Td className="whitespace-nowrap tabular-nums">{rule.withinMinutes} min</Td>
                <Td>
                  <Badge tone={rule.isActive ? 'success' : 'neutral'}>
                    {rule.isActive ? 'Active' : 'Off'}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Vitals review bands"
            description="Global defaults. A nurse can override these per patient."
          />
          <Table caption="Vitals thresholds" head={['Reading', 'Low', 'High', 'Note']}>
            {thresholds.map((threshold) => (
              <tr key={threshold.id}>
                <Td className="font-medium text-ink-900">{titleise(threshold.type)}</Td>
                <Td className="tabular-nums">{threshold.lowValue ?? '—'}</Td>
                <Td className="tabular-nums">{threshold.highValue ?? '—'}</Td>
                <Td className="text-ink-600">{threshold.note ?? '—'}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Care task catalogue" description={`${taskTemplates.length} tasks`} />
            <ul className="divide-y divide-[color:var(--border)]">
              {taskTemplates.map((template) => (
                <li key={template.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink-900">{template.label}</p>
                    <Badge tone="neutral">{titleise(template.category)}</Badge>
                  </div>
                  {template.instructions ? (
                    <p className="mt-1 text-ink-600">{template.instructions}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Lead sources" />
              <ul className="flex flex-wrap gap-2 px-5 py-4">
                {leadSources.map((source) => (
                  <li key={source.id}>
                    <Badge tone={source.isActive ? 'brand' : 'neutral'}>{source.label}</Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Notification templates" description={`${templates.length} configured`} />
              <ul className="divide-y divide-[color:var(--border)]">
                {templates.map((template) => (
                  <li key={template.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-700">
                        {template.key}
                      </code>
                      <Badge tone="neutral">{label(CHANNEL_LABELS, template.channel)}</Badge>
                    </div>
                    <p className="mt-1 text-ink-600">{template.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
