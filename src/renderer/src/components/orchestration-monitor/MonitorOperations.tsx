import { useState } from 'react'
import { Activity, Bot, CheckCircle2, CircleAlert, Inbox, ListFilter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import { MonitorParticipantAvatar } from './MonitorParticipantAvatar'
import { MonitorExecutionBadge } from './MonitorOperationStatus'
import { MonitorRequestCard } from './MonitorRequestCard'

export function MonitorOperations({
  data,
  details,
  requestsLimited,
  onSelect,
  onRefresh,
  onConfigure
}: {
  data: MonitorData
  details?: React.ReactNode
  requestsLimited: boolean
  onSelect: (selection: MonitorSelection) => void
  onRefresh: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [attentionOnly, setAttentionOnly] = useState(true)
  const bots = data.participants.filter((item) => item.kind === 'bot')
  const attention = data.requests.filter((item) => item.progress?.attention)
  const waiting = data.requests.filter(
    (item) =>
      ['queued', 'starting', 'blocked'].includes(item.progress?.stage ?? '') ||
      (item.progress?.stage === 'failed' && !item.outcome && item.delivery === 'pending')
  )
  const shown = attentionOnly ? attention : data.requests
  const stats = [
    { Icon: Bot, label: t('orchestrationMonitor.operations.bots', 'Bots'), value: bots.length },
    {
      Icon: Activity,
      label: t('orchestrationMonitor.operations.running', 'Running'),
      value: bots.filter((item) => ['working', 'starting'].includes(item.execution?.state ?? ''))
        .length
    },
    {
      Icon: Inbox,
      label: t('orchestrationMonitor.operations.waiting', 'Awaiting delivery'),
      value: waiting.length
    },
    {
      Icon: CircleAlert,
      label: t('orchestrationMonitor.operations.attention', 'Needs attention'),
      value: attention.length
    }
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 @min-[700px]/monitor:grid-cols-4">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4 text-card-foreground">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="size-4" />
              {label}
            </div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid min-w-0 items-start gap-4 @min-[1000px]/monitor:grid-cols-[minmax(0,1fr)_320px]">
        <section
          className="min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground"
          aria-label={t('orchestrationMonitor.operations.requests', 'Request inbox')}
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                {attentionOnly
                  ? t('orchestrationMonitor.operations.attention', 'Needs attention')
                  : t('orchestrationMonitor.operations.requests', 'Request inbox')}{' '}
                <span className="font-normal text-muted-foreground">{shown.length}</span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'orchestrationMonitor.operations.inboxHint',
                  'Inspect the reason, then choose the next action.'
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-pressed={attentionOnly}
              onClick={() => setAttentionOnly((value) => !value)}
            >
              <ListFilter className="size-4" />
              {attentionOnly
                ? t('orchestrationMonitor.operations.allRequests', 'All requests')
                : t('orchestrationMonitor.operations.attentionOnly', 'Needs attention only')}
            </Button>
          </header>
          {requestsLimited ? (
            <p className="border-b px-5 py-3 text-xs text-muted-foreground">
              {t(
                'orchestrationMonitor.operations.limited',
                'Showing up to 200 open or unanswered requests per host, with older open requests first.'
              )}
            </p>
          ) : null}
          <div className="scrollbar-sleek max-h-[720px] overflow-y-auto">
            {shown.length ? (
              shown.map((message) => (
                <MonitorRequestCard
                  key={message.id}
                  message={message}
                  participants={data.participants}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                  onConfigure={onConfigure}
                />
              ))
            ) : (
              <div className="space-y-3 px-5 py-12 text-center">
                <CheckCircle2 className="mx-auto size-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {t(
                    'orchestrationMonitor.operations.noAttention',
                    'No requests need attention in the displayed scope.'
                  )}
                </p>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {t(
                    'orchestrationMonitor.operations.noAttentionHint',
                    'Open requests stay here until a reply is recorded or they are cancelled. Long waits are flagged after five minutes.'
                  )}
                </p>
                {attentionOnly && data.requests.length ? (
                  <Button variant="ghost" size="sm" onClick={() => setAttentionOnly(false)}>
                    {t('orchestrationMonitor.operations.allRequests', 'All requests')}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">
            {t(
              'orchestrationMonitor.operations.safeRecovery',
              'Retries reuse the same request. Cancellation is offered only before delivery begins; unconfirmed deliveries require inspection.'
            )}
          </p>
        </section>
        {details ?? (
          <section
            className="min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground"
            aria-label={t('orchestrationMonitor.operations.botStatus', 'Bot status')}
          >
            <header className="flex items-center justify-between border-b px-4 py-4">
              <h2 className="text-sm font-semibold">
                {t('orchestrationMonitor.operations.botStatus', 'Bot status')}
              </h2>
              <Badge variant="outline">{bots.length}</Badge>
            </header>
            <div className="scrollbar-sleek max-h-[720px] overflow-y-auto">
              {bots.map((bot) => (
                <div key={bot.id} className="space-y-3 border-b px-4 py-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <MonitorParticipantAvatar participant={bot} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSelect({ kind: 'participant', id: bot.id })}
                      >
                        {bot.name}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        {bot.agent ?? '—'} · {bot.host.label}
                      </p>
                    </div>
                  </div>
                  <MonitorExecutionBadge state={bot.execution?.state ?? 'unavailable'} />
                  {bot.execution?.detail ? (
                    <p className="break-words text-xs text-muted-foreground">
                      {bot.execution.detail}
                    </p>
                  ) : null}
                </div>
              ))}
              {!bots.length ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  {t('orchestrationMonitor.operations.noBots', 'No bots in this scope.')}
                </p>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
