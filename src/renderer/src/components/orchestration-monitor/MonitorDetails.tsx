import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type { OrchestrationMonitorMessageDetail } from '../../../../shared/orchestration/orchestration-monitor'
import type { MonitorData, MonitorSelection } from './monitor-host-snapshot'
import type { MonitorRelation } from './monitor-relations'
import { deliveryLabel, monitorLabel, monitorParticipantHost } from './monitor-labels'
import { MonitorExecutionBadge, MonitorProgressBadge } from './MonitorOperationStatus'
import { progressReason } from './monitor-operation-labels'

export function MonitorMessageBadges({
  message
}: {
  message: MonitorData['messages'][number]
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex flex-wrap gap-1.5">
      {message.progress ? <MonitorProgressBadge progress={message.progress} /> : null}
      <Badge variant={message.delivery === 'pending' ? 'warning' : 'secondary'}>
        {deliveryLabel(t, message.delivery)}
      </Badge>
      {message.question ? (
        <Badge variant={message.question === 'pending' ? 'warning' : 'outline'}>
          {message.question === 'pending'
            ? t('orchestrationMonitor.awaitingAnswer', 'Awaiting answer')
            : monitorLabel(t, message.question)}
        </Badge>
      ) : null}
      {message.outcome ? <Badge variant="outline">{monitorLabel(t, message.outcome)}</Badge> : null}
      {message.task ? (
        <Badge variant="outline">
          {t('orchestrationMonitor.task', 'Task')}: {monitorLabel(t, message.task.status)}
        </Badge>
      ) : null}
    </div>
  )
}

function DetailField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

export function MessageBody({
  message
}: {
  message: MonitorData['messages'][number]
}): React.JSX.Element {
  const t = useTranslate()
  const [version, retry] = useState(0)
  const [result, setResult] = useState<{
    id: string
    detail?: OrchestrationMonitorMessageDetail
    error?: string
  } | null>(null)
  const { id, rawId, host } = message
  useEffect(() => {
    if (host.state !== 'ready') {
      return
    }
    const controller = new AbortController()
    setResult(null)
    void callRuntimeRpc<OrchestrationMonitorMessageDetail>(
      host.target,
      'orchestration.monitorMessage',
      { id: rawId },
      {
        signal: controller.signal,
        timeoutMs: 15_000,
        suppressFeatureInteraction: true
      }
    )
      .then((detail) => {
        if (!controller.signal.aborted) {
          setResult({ id, detail })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ id, error: error instanceof Error ? error.message : String(error) })
        }
      })
    return () => controller.abort()
  }, [id, rawId, host.target, host.state, version])
  if (host.state !== 'ready') {
    return (
      <p className="text-sm text-muted-foreground">
        {t('orchestrationMonitor.bodyOffline', 'Reconnect this host to read the full message.')}
      </p>
    )
  }
  if (!result || result.id !== id) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        {t('orchestrationMonitor.loadingBody', 'Loading message…')}
      </p>
    )
  }
  if (result.error) {
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm">
          {t('orchestrationMonitor.bodyError', 'Could not read the message.')}
        </p>
        <p className="break-words text-xs text-muted-foreground">{result.error}</p>
        <Button variant="outline" size="sm" onClick={() => retry((value) => value + 1)}>
          {t('orchestrationMonitor.retry', 'Retry')}
        </Button>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">
          {t('orchestrationMonitor.body', 'Original message')}
        </h3>
        <pre className="whitespace-pre-wrap break-words rounded-md border bg-background p-3 font-mono text-xs [overflow-wrap:anywhere]">
          {result.detail?.body || t('orchestrationMonitor.emptyBody', 'No body')}
        </pre>
      </div>
      {result.detail?.payload ? (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            {t('orchestrationMonitor.payload', 'Message payload')}
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-background p-3 font-mono text-xs [overflow-wrap:anywhere]">
            {result.detail.payload}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

export function MonitorDetails({
  data,
  relations,
  selection,
  onSelect,
  onOpenWork
}: {
  data: MonitorData
  relations: MonitorRelation[]
  selection: MonitorSelection
  onSelect: (selection: MonitorSelection) => void
  onOpenWork?: (hostId: string, runId: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const participant =
    selection?.kind === 'participant'
      ? data.participants.find((item) => item.id === selection.id)
      : null
  const message =
    selection?.kind === 'message'
      ? [...data.messages, ...data.requests].find((item) => item.id === selection.id)
      : null
  const relation =
    selection?.kind === 'relation' ? relations.find((item) => item.id === selection.id) : null
  const name = (id: string) => data.participants.find((item) => item.id === id)?.name ?? id
  return (
    <aside
      className="min-w-0 rounded-xl border bg-card text-card-foreground @min-[1000px]/monitor:sticky @min-[1000px]/monitor:top-0 @min-[1000px]/monitor:max-h-full @min-[1000px]/monitor:overflow-y-auto scrollbar-sleek"
      aria-label={t('orchestrationMonitor.details', 'Details')}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t('orchestrationMonitor.details', 'Details')}</h2>
        {selection ? (
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
            {t('orchestrationMonitor.clear', 'Clear selection')}
          </Button>
        ) : null}
      </div>
      <div className="space-y-5 p-4">
        {participant ? (
          <>
            <h3 className="break-words text-base font-semibold">{participant.name}</h3>
            <div className="flex gap-2">
              <Badge variant="secondary">{monitorLabel(t, participant.kind)}</Badge>
              {participant.execution ? (
                <MonitorExecutionBadge state={participant.execution.state} />
              ) : (
                <Badge variant="outline">{monitorLabel(t, participant.state)}</Badge>
              )}
            </div>
            <dl className="space-y-4">
              <DetailField label={t('orchestrationMonitor.host', 'Host')}>
                {participant.host.label}
              </DetailField>
              {participant.executionHost ? (
                <DetailField label={t('orchestrationMonitor.executionHost', 'Execution host')}>
                  {monitorParticipantHost(t, participant)}
                </DetailField>
              ) : null}
              <DetailField label={t('orchestrationMonitor.agent', 'CLI / agent')}>
                {participant.agent ?? t('orchestrationMonitor.notObserved', 'Not observed')}
              </DetailField>
              <DetailField label={t('orchestrationMonitor.model', 'Configured model')}>
                {participant.model ?? t('orchestrationMonitor.notObserved', 'Not observed')}
              </DetailField>
              <DetailField label={t('orchestrationMonitor.address', 'Mailbox address')}>
                <span className="font-mono text-xs">{participant.address}</span>
              </DetailField>
              {participant.cwd ? (
                <DetailField label={t('orchestrationMonitor.cwd', 'Working folder')}>
                  <span className="font-mono text-xs">{participant.cwd}</span>
                </DetailField>
              ) : null}
            </dl>
            <p className="text-xs text-muted-foreground">
              {t(
                'orchestrationMonitor.registeredNote',
                'Registration or connection alone does not mean an agent is working.'
              )}
            </p>
          </>
        ) : message ? (
          <>
            <h3 className="break-words text-base font-semibold">{message.subject}</h3>
            <MonitorMessageBadges message={message} />
            {message.progress ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {progressReason(t, message.progress.reason)}
              </p>
            ) : null}
            <dl className="space-y-4">
              <DetailField label={t('orchestrationMonitor.from', 'From')}>
                <Button
                  variant="link"
                  size="inlineText"
                  className="text-left whitespace-normal"
                  onClick={() => onSelect({ kind: 'participant', id: message.from })}
                >
                  {name(message.from)}
                </Button>
                <div className="font-mono text-xs text-muted-foreground">{message.fromAddress}</div>
              </DetailField>
              <DetailField label={t('orchestrationMonitor.to', 'To')}>
                <Button
                  variant="link"
                  size="inlineText"
                  className="text-left whitespace-normal"
                  onClick={() => onSelect({ kind: 'participant', id: message.to })}
                >
                  {name(message.to)}
                </Button>
                <div className="font-mono text-xs text-muted-foreground">{message.toAddress}</div>
              </DetailField>
              <DetailField label={t('orchestrationMonitor.host', 'Host')}>
                {message.host.label}
              </DetailField>
              <DetailField label={t('orchestrationMonitor.type', 'Type')}>
                {monitorLabel(t, message.type)}
              </DetailField>
              <DetailField label={t('orchestrationMonitor.sentAt', 'Sent at')}>
                {new Date(message.createdAt).toLocaleString(locale)}
              </DetailField>
              {message.task ? (
                <DetailField label={t('orchestrationMonitor.task', 'Task')}>
                  {message.task.title}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {monitorLabel(t, message.task.status)}
                    {message.task.dispatchStatus
                      ? ` · ${monitorLabel(t, message.task.dispatchStatus)}`
                      : ''}
                  </div>
                </DetailField>
              ) : null}
              {message.threadId ? (
                <DetailField label={t('orchestrationMonitor.thread', 'Reply to')}>
                  <span className="font-mono text-xs">{message.threadId}</span>
                </DetailField>
              ) : null}
            </dl>
            {message.workRunId && onOpenWork ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenWork(message.host.id, message.workRunId!)}
              >
                {t('orchestrationMonitor.work.openWork', 'Track this work')}
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t(
                'orchestrationMonitor.receiptNote',
                'Receipt acknowledgement is separate from task completion.'
              )}
            </p>
            <MessageBody message={message} />
          </>
        ) : relation ? (
          <>
            <h3 className="break-words text-base font-semibold">
              {name(relation.from)} → {name(relation.to)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                'orchestrationMonitor.relationCounts',
                '{{messages}} messages · {{tasks}} delegations',
                { messages: relation.messages.length, tasks: relation.assignments.length }
              )}
            </p>
            {relation.assignments.map((assignment) => (
              <div key={assignment.id} className="space-y-2 rounded-md border p-3">
                <p className="break-words text-sm">{assignment.task.title}</p>
                <Badge variant="outline">{monitorLabel(t, assignment.task.status)}</Badge>
              </div>
            ))}
            {relation.messages.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="h-auto w-full flex-col items-start text-left whitespace-normal"
                onClick={() => onSelect({ kind: 'message', id: item.id })}
              >
                <span className="break-words text-sm">{item.subject}</span>
                <MonitorMessageBadges message={item} />
              </Button>
            ))}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              'orchestrationMonitor.selectHint',
              'Select a participant, connection, or message to inspect its details.'
            )}
          </p>
        )}
      </div>
    </aside>
  )
}
