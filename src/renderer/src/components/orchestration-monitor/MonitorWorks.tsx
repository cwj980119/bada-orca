import {
  ArrowLeft,
  ArrowUpRight,
  CheckCheck,
  Layers3,
  Loader2,
  MessageSquare,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { MonitorWorkDetail } from '../../../../shared/orchestration/orchestration-work-monitor'
import type { MonitorData, MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorWorkLabel, monitorWorkState } from './monitor-work-labels'
import { MonitorWorkTasks } from './MonitorWorkTasks'
import { MonitorWorkLimits } from './MonitorWorkLimits'
import {
  useMonitorWorks,
  type HostedMonitorWork,
  type MonitorWorkSelection
} from './use-monitor-works'

export function MonitorWorks({
  hosts,
  query,
  selection,
  onSelect,
  messages,
  onOpenMessage
}: {
  hosts: readonly MonitorHostSnapshot[]
  query: string
  selection: MonitorWorkSelection
  onSelect: (selection: MonitorWorkSelection) => void
  messages: MonitorData['messages']
  onOpenMessage: (id: string) => void
}): React.JSX.Element {
  const state = useMonitorWorks(hosts, selection)
  const host = hosts.find((candidate) => candidate.id === selection?.hostId)
  return (
    <MonitorWorksPanel
      {...state}
      host={host}
      query={query}
      selection={selection}
      onSelect={onSelect}
      onRefresh={state.refresh}
      messages={messages}
      onOpenMessage={onOpenMessage}
    />
  )
}

export function MonitorWorksPanel({
  works,
  detail,
  host,
  errors,
  loading,
  limited,
  query,
  selection,
  onSelect,
  onRefresh,
  messages,
  onOpenMessage
}: {
  works: HostedMonitorWork[]
  detail: MonitorWorkDetail | null
  host?: MonitorHostSnapshot
  errors: string[]
  loading: boolean
  limited: boolean
  query: string
  selection: MonitorWorkSelection
  onSelect: (selection: MonitorWorkSelection) => void
  onRefresh: () => void
  messages: MonitorData['messages']
  onOpenMessage: (id: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const needle = query.trim().toLocaleLowerCase()
  const filtered = works.filter((work) =>
    `${work.objective} ${work.id} ${work.coordinator ?? ''} ${work.host.label}`
      .toLocaleLowerCase()
      .includes(needle)
  )
  const linkedMessages =
    detail && host
      ? messages
          .filter((message) => message.host.id === host.id && message.runId === detail.work.id)
          .slice(0, 12)
      : []
  return (
    <div className="space-y-4">
      {errors.length ? (
        <div
          role="status"
          className="space-y-1 rounded-lg border p-3 text-xs text-muted-foreground"
        >
          <p>
            {t(
              'orchestrationMonitor.work.readFailed',
              'Some work records could not be read. Check the host connection and refresh.'
            )}
          </p>
          {errors.map((error) => (
            <p key={error} className="break-words">
              {error}
            </p>
          ))}
        </div>
      ) : null}
      {selection ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            <ArrowLeft className="size-4" />
            {t('orchestrationMonitor.work.allWorks', 'All work')}
          </Button>
          {detail && host ? (
            <>
              <section className="rounded-xl border bg-card p-5 text-card-foreground">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{host.label}</Badge>
                  <Badge
                    variant={
                      monitorWorkState(detail.work) === 'stop_unknown' ? 'warning' : 'secondary'
                    }
                  >
                    {monitorWorkLabel(t, monitorWorkState(detail.work))}
                  </Badge>
                </div>
                <h2 className="whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed">
                  {detail.work.objective}
                </h2>
                <p className="mt-2 break-all font-mono text-2xs text-muted-foreground">
                  {detail.work.id}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
                  <WorkMetric
                    icon={<CheckCheck className="size-4" />}
                    label={t('orchestrationMonitor.work.completedTasks', 'Tasks completed')}
                    value={`${detail.work.tasks.completed} / ${detail.work.tasks.total}`}
                  />
                  <WorkMetric
                    icon={<Users className="size-4" />}
                    label={t('orchestrationMonitor.work.activeWorkers', 'Active workers')}
                    value={`${detail.work.activeWorkers}${detail.work.limits.maxActiveWorkers ? ` / ${detail.work.limits.maxActiveWorkers}` : ''}`}
                  />
                  <WorkMetric
                    icon={<MessageSquare className="size-4" />}
                    label={t('orchestrationMonitor.work.botRequests', 'Bot requests')}
                    value={`${detail.work.botRequests}${detail.work.limits.maxBotRequests ? ` / ${detail.work.limits.maxBotRequests}` : ''}`}
                  />
                </div>
                <p className="mt-4 break-words text-xs text-muted-foreground">
                  {detail.work.coordinator ?? '—'} ·{' '}
                  {new Date(detail.work.createdAt).toLocaleString(locale)}
                </p>
              </section>
              <div className="grid min-w-0 items-start gap-4 @min-[1100px]/monitor:grid-cols-[minmax(0,1fr)_340px]">
                <MonitorWorkTasks key={detail.work.id} detail={detail} host={host} />
                <div className="min-w-0 space-y-4">
                  <MonitorWorkLimits
                    key={`${host.id}:${detail.work.id}:${detail.work.limits.revision}`}
                    work={detail.work}
                    host={host}
                    onRefresh={onRefresh}
                  />
                  {linkedMessages.length ? (
                    <section className="rounded-xl border bg-card p-4 text-card-foreground">
                      <h3 className="mb-3 text-sm font-semibold">
                        {t('orchestrationMonitor.work.relatedMessages', 'Related conversations')}
                      </h3>
                      <div className="space-y-1">
                        {linkedMessages.map((message) => (
                          <button
                            key={message.id}
                            type="button"
                            className="flex w-full items-start justify-between gap-2 rounded-lg p-2 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => onOpenMessage(message.id)}
                          >
                            <span className="min-w-0 break-words">{message.subject}</span>
                            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p role="status" className="rounded-xl border p-6 text-sm text-muted-foreground">
              {host?.state === 'ready' && !errors.length
                ? t('orchestrationMonitor.work.loading', 'Reading work records…')
                : t(
                    'orchestrationMonitor.work.unavailable',
                    'Work details are unavailable. Refresh or return to the work list.'
                  )}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 py-1">
            <div>
              <h2 className="text-sm font-semibold">
                {t('orchestrationMonitor.work.title', 'Work tracking')}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'orchestrationMonitor.work.subtitle',
                  'Objectives, task handoffs, and results in one place.'
                )}
              </p>
            </div>
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
            ) : null}
          </div>
          {limited ? (
            <p className="text-xs text-muted-foreground">
              {t(
                'orchestrationMonitor.work.listLimited',
                'Showing up to 100 work records per host, with active work first.'
              )}
            </p>
          ) : null}
          {filtered.length ? (
            <div className="grid min-w-0 gap-3 @min-[750px]/monitor:grid-cols-2 @min-[1400px]/monitor:grid-cols-3">
              {filtered.map((work) => {
                const state = monitorWorkState(work)
                const percentage = work.tasks.total
                  ? (work.tasks.completed / work.tasks.total) * 100
                  : 0
                return (
                  <button
                    type="button"
                    key={JSON.stringify([work.host.id, work.id])}
                    onClick={() => onSelect({ hostId: work.host.id, runId: work.id })}
                    className={cn(
                      'min-w-0 rounded-xl border bg-card p-5 text-left text-card-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{work.host.label}</span>
                      <Badge
                        variant={['failed', 'stop_unknown'].includes(state) ? 'warning' : 'outline'}
                      >
                        {monitorWorkLabel(t, state)}
                      </Badge>
                    </div>
                    <h3 className="mt-4 line-clamp-2 min-h-12 break-words text-base font-semibold">
                      {work.objective}
                    </h3>
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {work.coordinator ?? '—'}
                    </p>
                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {t('orchestrationMonitor.work.completedTasks', 'Tasks completed')}
                        </span>
                        <span>
                          {work.tasks.completed} / {work.tasks.total}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        aria-label={t(
                          'orchestrationMonitor.work.completedTasks',
                          'Tasks completed'
                        )}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {work.activeWorkers}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="size-3.5" />
                        {work.botRequests}
                      </span>
                      <span className="ml-auto">
                        {new Date(work.updatedAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border p-8 text-center">
              <Layers3 className="mx-auto mb-3 size-6 text-muted-foreground" />
              <p className="text-sm">
                {loading
                  ? t('orchestrationMonitor.work.loading', 'Reading work records…')
                  : t(
                      'orchestrationMonitor.work.empty',
                      'No matching work records. Work appears here when an orchestration Run is created.'
                    )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WorkMetric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex min-h-8 items-start gap-1.5 text-muted-foreground @min-[700px]/monitor:min-h-4">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
