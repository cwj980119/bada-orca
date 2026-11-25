import { useState } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import type {
  MonitorRecoveryAction,
  MonitorRecoveryResult
} from '../../../../shared/orchestration/orchestration-monitor'
import type { MonitorData } from './monitor-host-snapshot'
import { createStructuredAgentSessionOperationId } from '../../../../shared/agent-session/lifecycle/operations/structured-agent-session-mutation'
import { createNonSecureContextUuid } from '../../../../shared/identifiers/non-secure-context-uuid'

export function useMonitorRecovery(
  message: MonitorData['messages'][number],
  onRefresh: () => void
) {
  const [pending, setPending] = useState<MonitorRecoveryAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MonitorRecoveryResult['result'] | null>(null)
  const recover = async (action: MonitorRecoveryAction) => {
    if (pending || message.host.state !== 'ready') {
      return
    }
    setPending(action)
    setError(null)
    setResult(null)
    try {
      const response = await callRuntimeRpc<MonitorRecoveryResult>(
        message.host.target,
        'orchestration.monitorRecover',
        {
          id: message.rawId,
          action,
          operationId: createStructuredAgentSessionOperationId(createNonSecureContextUuid)
        },
        { timeoutMs: 30_000 }
      )
      setResult(response.result)
      onRefresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPending(null)
    }
  }
  return { pending, error, result, recover }
}
