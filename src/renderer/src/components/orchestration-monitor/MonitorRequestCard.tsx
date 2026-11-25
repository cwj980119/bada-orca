import { ArrowRight, Loader2, RotateCcw, Play, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import { MonitorParticipantAvatar } from './MonitorParticipantAvatar'
import { MonitorProgressBadge } from './MonitorOperationStatus'
import { progressReason } from './monitor-operation-labels'
import { useMonitorRecovery } from './use-monitor-recovery'

export function MonitorRequestCard({
  message,
  participants,
  onSelect,
  onRefresh,
  onConfigure
}: {
  message: MonitorData['messages'][number]
  participants: MonitorData['participants']
  onSelect: (selection: MonitorSelection) => void
  onRefresh: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const recovery = useMonitorRecovery(message, onRefresh)
  const progress = message.progress
  const from = participants.find((item) => item.id === message.from)
  const to = participants.find((item) => item.id === message.to)
  const actions = progress?.actions ?? []
  const disabled =
    recovery.pending !== null || message.host.state !== 'ready' || recovery.result === 'cancelled'
  const notices = {
    queued: t(
      'orchestrationMonitor.operations.retryQueued',
      'Delivery has been requested again. The same request is retained.'
    ),
    resumed: t(
      'orchestrationMonitor.operations.resumed',
      'The chat queue was resumed and delivery requested again.'
    ),
    cancelled: t('orchestrationMonitor.operations.cancelled', 'The waiting request was cancelled.'),
    unchanged: t(
      'orchestrationMonitor.operations.unchanged',
      'The request has already changed. Its current state is being refreshed.'
    )
  }
  return (
    <article className="space-y-4 border-b px-5 py-5 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MonitorParticipantAvatar participant={from} />
          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          <MonitorParticipantAvatar participant={to} />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">
              {from?.name ?? message.fromAddress} → {to?.name ?? message.toAddress}
            </p>
            <p className="text-xs text-muted-foreground">
              {message.host.label} ·{' '}
              <time dateTime={message.createdAt}>
                {new Date(message.createdAt).toLocaleString(locale, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </p>
          </div>
        </div>
        {progress ? <MonitorProgressBadge progress={progress} /> : null}
      </div>
      <div className="space-y-2">
        <h3 className="break-words text-sm font-semibold">{message.subject}</h3>
        <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {message.preview}
        </p>
      </div>
      {progress ? (
        <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-2.5">
          <p className="text-xs leading-relaxed">{progressReason(t, progress.reason)}</p>
          {progress.detail ? (
            <p className="break-words font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {progress.detail}
            </p>
          ) : null}
        </div>
      ) : null}
      {message.host.state !== 'ready' ? (
        <p className="text-xs text-muted-foreground">
          {t(
            'orchestrationMonitor.operations.offlineActions',
            'Reconnect this host to use recovery actions. Retained state may be out of date.'
          )}
        </p>
      ) : null}
      {actions.includes('resume') ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            'orchestrationMonitor.operations.resumeScope',
            'Resuming releases this chat’s other queued work too.'
          )}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {actions.includes('retry') ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => void recovery.recover('retry')}
          >
            {recovery.pending === 'retry' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {t('orchestrationMonitor.operations.retry', 'Retry delivery')}
          </Button>
        ) : null}
        {actions.includes('resume') ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => void recovery.recover('resume')}
          >
            {recovery.pending === 'resume' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Play className="size-4" />
            )}
            {t('orchestrationMonitor.operations.resume', 'Resume bot chat')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect({ kind: 'message', id: message.id })}
        >
          {t('orchestrationMonitor.details', 'Details')}
        </Button>
        {progress && ['startup_failed', 'unavailable'].includes(progress.reason) ? (
          <Button variant="ghost" size="sm" onClick={onConfigure}>
            <Settings2 className="size-4" />
            {t('orchestrationMonitor.connectionsSettings', 'Connection settings')}
          </Button>
        ) : null}
        {actions.includes('cancel') ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => void recovery.recover('cancel')}
          >
            {recovery.pending === 'cancel' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}
            {t('orchestrationMonitor.operations.cancel', 'Cancel waiting request')}
          </Button>
        ) : null}
      </div>
      {recovery.error ? (
        <p role="alert" className="break-words text-xs text-destructive">
          {recovery.error}
        </p>
      ) : null}
      {recovery.result ? (
        <p role="status" className="text-xs text-muted-foreground">
          {notices[recovery.result]}
        </p>
      ) : null}
    </article>
  )
}
