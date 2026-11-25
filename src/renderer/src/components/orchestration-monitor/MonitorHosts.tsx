import { Badge } from '@/components/ui/badge'
import { HostCombobox } from '@/components/host-picker/HostCombobox'
import { boundHostList } from '@/components/host-picker/bounded-host-list'
import { HostListOverflowNote } from '@/components/host-picker/HostListOverflowNote'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorLabel } from './monitor-labels'

export function MonitorHostPicker({
  hosts,
  value,
  onChange
}: {
  hosts: readonly MonitorHostSnapshot[]
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <HostCombobox
      value={value}
      onChange={onChange}
      ariaLabel={t('orchestrationMonitor.hostFilter', 'Filter by host')}
      options={[
        { id: 'all', label: t('orchestrationMonitor.allHosts', 'All hosts') },
        ...hosts.map((host) => ({ id: host.id, label: host.label }))
      ]}
    />
  )
}

export function MonitorHostStatus({
  hosts
}: {
  hosts: readonly MonitorHostSnapshot[]
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const rows = boundHostList(hosts)
  const failed = boundHostList(hosts.filter((host) => !['ready', 'loading'].includes(host.state)))
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" aria-live="polite">
        {rows.shown.map((host) => (
          <Badge
            key={host.id}
            variant={
              ['error', 'offline', 'unsupported'].includes(host.state) ? 'warning' : 'outline'
            }
          >
            {host.label} · {monitorLabel(t, host.state)}
            {host.snapshot
              ? ` · ${new Date(host.snapshot.capturedAt).toLocaleTimeString(locale)}`
              : ''}
          </Badge>
        ))}
        <HostListOverflowNote hiddenCount={rows.hiddenCount} />
      </div>
      {failed.shown.length ? (
        <div role="status" className="mb-4 rounded-md border p-3 text-sm">
          <p>
            {t(
              'orchestrationMonitor.hostFailure',
              'Some hosts could not be read. Retained records may be out of date. Refresh to retry.'
            )}
          </p>
          {failed.shown.map((host) => (
            <p key={host.id} className="mt-1 break-words text-xs text-muted-foreground">
              {host.label}: {host.error ?? monitorLabel(t, host.state)}
            </p>
          ))}
          <HostListOverflowNote hiddenCount={failed.hiddenCount} />
        </div>
      ) : null}
    </>
  )
}
