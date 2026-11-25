import { useState } from 'react'
import { Loader2, ShieldCheck, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { MonitorWork } from '../../../../shared/orchestration/orchestration-work-monitor'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorWorkLabel } from './monitor-work-labels'

function localDateTime(value: string | null): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function MonitorWorkLimits({
  work,
  host,
  onRefresh
}: {
  work: MonitorWork
  host: MonitorHostSnapshot
  onRefresh: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const [workers, setWorkers] = useState(work.limits.maxActiveWorkers?.toString() ?? '')
  const [requests, setRequests] = useState(work.limits.maxBotRequests?.toString() ?? '')
  const [deadline, setDeadline] = useState(localDateTime(work.limits.deadlineAt))
  const [confirmStop, setConfirmStop] = useState(false)
  const [pending, setPending] = useState<'save' | 'stop' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const stopped = Boolean(work.limits.stoppedAt)
  const disabled = pending !== null || host.state !== 'ready'
  const act = async (action: 'save' | 'stop') => {
    if (disabled) {
      return
    }
    setPending(action)
    setError(null)
    setSaved(false)
    try {
      await callRuntimeRpc(
        host.target,
        action === 'save' ? 'orchestration.monitorWorkLimits' : 'orchestration.monitorWorkStop',
        action === 'save'
          ? {
              runId: work.id,
              revision: work.limits.revision,
              maxActiveWorkers: workers === '' ? null : Number(workers),
              maxBotRequests: requests === '' ? null : Number(requests),
              deadlineAt: deadline ? new Date(deadline).toISOString() : null
            }
          : { runId: work.id },
        { timeoutMs: 60_000 }
      )
      setSaved(action === 'save')
      setConfirmStop(false)
      onRefresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      onRefresh()
    } finally {
      setPending(null)
    }
  }
  return (
    <section className="rounded-xl border bg-card p-4 text-card-foreground">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-muted-foreground" />
        {t('orchestrationMonitor.work.limits', 'Execution limits')}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t(
          'orchestrationMonitor.work.limitScope',
          'Limits apply to workers and bot requests registered to this work. Lowering a limit blocks new starts; it leaves existing workers running.'
        )}
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void act('save')
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-xs">
            <span>{t('orchestrationMonitor.work.workerLimit', 'Concurrent workers')}</span>
            <Input
              type="number"
              min={1}
              max={1000}
              step={1}
              value={workers}
              disabled={disabled || stopped}
              onChange={(event) => setWorkers(event.target.value)}
              placeholder={t('orchestrationMonitor.work.unlimited', 'Unlimited')}
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span>{t('orchestrationMonitor.work.requestLimit', 'Total bot requests')}</span>
            <Input
              type="number"
              min={1}
              max={100000}
              step={1}
              value={requests}
              disabled={disabled || stopped}
              onChange={(event) => setRequests(event.target.value)}
              placeholder={t('orchestrationMonitor.work.unlimited', 'Unlimited')}
            />
          </label>
        </div>
        <label className="block space-y-1.5 text-xs">
          <span>{t('orchestrationMonitor.work.deadline', 'Stop at (your local time)')}</span>
          <Input
            type="datetime-local"
            value={deadline}
            disabled={disabled || stopped}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
        {!stopped ? (
          <Button type="submit" variant="outline" size="sm" disabled={disabled}>
            {pending === 'save' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}
            {t('orchestrationMonitor.work.saveLimits', 'Save limits')}
          </Button>
        ) : null}
      </form>
      {saved ? (
        <p role="status" className="mt-3 text-xs">
          {t('orchestrationMonitor.work.saved', 'Limits saved.')}
        </p>
      ) : null}
      <div className="mt-4 border-t pt-4">
        {stopped ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {t('orchestrationMonitor.work.fenced', 'New work blocked since {{time}}.', {
              time: new Date(work.limits.stoppedAt!).toLocaleString(locale)
            })}
            {work.limits.stopReason === 'deadline'
              ? ` ${t('orchestrationMonitor.work.deadlineReached', 'Execution deadline reached.')}`
              : ''}
          </p>
        ) : null}
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {t(
            'orchestrationMonitor.work.stopScope',
            'Stop blocks new work and stops this work’s registered workers, including helpers. Bot messages already received remain in their chats. Kept-open workers and unreachable hosts need attention.'
          )}
        </p>
        {confirmStop ? (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm">
              {t(
                'orchestrationMonitor.work.confirmStop',
                'Stop this entire work? Stopped workers cannot be resumed here.'
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={disabled}
                onClick={() => void act('stop')}
              >
                {pending === 'stop' ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Square className="size-3" />
                )}
                {t('orchestrationMonitor.work.stopConfirm', 'Stop work')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => setConfirmStop(false)}
              >
                {t('orchestrationMonitor.work.keepRunning', 'Go back')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => setConfirmStop(true)}
          >
            <Square className="size-3" />
            {stopped
              ? t('orchestrationMonitor.work.retryStop', 'Recheck remaining stops')
              : t('orchestrationMonitor.work.stopAll', 'Stop entire work')}
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-3 break-words text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {work.stopOutcomes.length ? (
        <ul className="mt-4 space-y-2 border-t pt-3">
          {work.stopOutcomes.map((outcome) => (
            <li key={outcome.dispatchId} className="text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono">{outcome.dispatchId}</span>
                <span>{monitorWorkLabel(t, outcome.state)}</span>
              </div>
              {outcome.detail ? (
                <p className="mt-1 break-words text-muted-foreground">{outcome.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
