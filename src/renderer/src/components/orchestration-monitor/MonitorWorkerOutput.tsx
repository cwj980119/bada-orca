import { settleMonitorAction } from './settle-monitor-action'
import { useState } from 'react'
import { ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { openOrchestrationDispatch } from '@/lib/agent-session/open/open-agent-message-sender'
import { isTextBlock } from '../../../../shared/native-chat/native-chat-types'
import type { OrchestrationWorkerReadResult } from '../../../../shared/orchestration/workers/orchestration-worker-output'
import type { MonitorHostSnapshot } from './monitor-host-snapshot'

export function MonitorWorkerOutput({
  dispatchId,
  label,
  host
}: {
  dispatchId: string
  label: string
  host: MonitorHostSnapshot
}): React.JSX.Element {
  const t = useTranslate()
  const [output, setOutput] = useState<OrchestrationWorkerReadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [opening, setOpening] = useState(false)
  const read = async () => {
    if (pending || host.state !== 'ready') {
      return
    }
    setPending(true)
    setError(null)
    await settleMonitorAction(
      async () => {
        try {
          setOutput(
            await callRuntimeRpc<OrchestrationWorkerReadResult>(
              host.target,
              'orchestration.workerRead',
              { dispatch: dispatchId, source: 'auto', limit: 60 },
              { timeoutMs: 20_000 }
            )
          )
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      },
      () => setPending(false)
    )
  }
  const open = async () => {
    setOpening(true)
    setError(null)
    await settleMonitorAction(
      async () => {
        try {
          await openOrchestrationDispatch(`dispatch:${dispatchId}`, label, host.target)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      },
      () => setOpening(false)
    )
  }
  const text =
    output?.source === 'terminal'
      ? output.terminal.tail.join('\n')
      : output?.transcript.messages
          .map((message) =>
            message.blocks
              .filter(isTextBlock)
              .map((block) => block.text)
              .join('\n')
          )
          .filter(Boolean)
          .join('\n\n')
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={opening || host.state !== 'ready'}
          onClick={() => void open()}
        >
          <ExternalLink className="size-3.5" />
          {t('orchestrationMonitor.work.openWorker', 'Open worker')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending || host.state !== 'ready'}
          onClick={() => void read()}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <FileText className="size-3.5" />
          )}
          {output
            ? t('orchestrationMonitor.work.refreshOutput', 'Refresh output')
            : t('orchestrationMonitor.work.readOutput', 'Read output')}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 break-words text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {output ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {t(
              'orchestrationMonitor.work.outputPreview',
              'Recent text output. Open the worker for its full conversation or terminal.'
            )}
          </p>
          <pre className="scrollbar-sleek max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
            {text || t('orchestrationMonitor.work.noOutput', 'No text output was returned.')}
          </pre>
          {output.warnings.map((warning) => (
            <p key={warning} className="break-words text-xs text-muted-foreground">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
