import type {
  MonitorRecoveryAction,
  MonitorRecoveryResult
} from '../../../../shared/orchestration/orchestration-monitor'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { runKeyedSerializedOperation } from '../../../../shared/concurrency/keyed-serialized-operations'
import { structuredMailboxCustody } from '../mailbox/routing/structured-session-mail-target'
import { getStructuredAgentSessionHost } from '../../../native-chat/agent-session-wire/host/structured-agent-session-registry'
import { mintAgentSessionOperationId } from '../mailbox/structured-pointer/structured-pointer-operation-id'
import { structuredAgentSessionPayloadFingerprint } from '../../../../shared/agent-session/lifecycle/operations/structured-agent-session-mutation'
import { runLifecycleWriteTransaction } from '../db/lifecycle-write-transaction-runner'
import { notifyBotRequestOutcome } from '../../rpc/methods/orchestration/messaging/bot-request-outcome'
import { OrchestrationError } from '../orchestration-error'
import { createMonitorRead } from './orchestration-monitor-read'
import { enrichMonitorExecution } from './monitor-execution-read'

const queues = new WeakMap<OrcaRuntimeService, Map<string, Promise<void>>>()

export function recoverMonitorRequest(
  runtime: OrcaRuntimeService,
  id: string,
  action: MonitorRecoveryAction,
  operationId = mintAgentSessionOperationId(Date.now())
): Promise<MonitorRecoveryResult> {
  const queue = queues.get(runtime) ?? new Map<string, Promise<void>>()
  queues.set(runtime, queue)
  return runKeyedSerializedOperation(queue, id, async () => {
    const db = runtime.getOrchestrationDb()
    const request = db.getBotRequest(id)
    const original = db.getMessageById(id)
    if (!request || !original) {
      throw new OrchestrationError('invalid_argument', 'This bot request no longer exists.')
    }
    if (action === 'cancel' && db.getBotRequestOutcome(id) === 'dropped') {
      return { result: 'cancelled' }
    }
    if (original.read || db.getBotRequestOutcome(id)) {
      return { result: 'unchanged' }
    }
    await runtime.ensureStructuredAgentSessionHost()
    const host = getStructuredAgentSessionHost()
    const projected = createMonitorRead(runtime).message(original)
    await enrichMonitorExecution(runtime, [], [projected])
    if (!projected.progress?.actions.includes(action)) {
      throw new OrchestrationError(
        'invalid_argument',
        'The request changed or cannot safely perform this action. Refresh to inspect its current state.'
      )
    }
    const current = () => {
      const row = db.getMessageById(id)
      if (!row || row.read || row.to_handle !== original.to_handle || db.getBotRequestOutcome(id)) {
        throw new OrchestrationError(
          'invalid_argument',
          'The request has already moved or been handled. Refresh to inspect it.'
        )
      }
      return row
    }
    if (action === 'cancel') {
      const notifications: (() => void)[] = []
      const cancelled = runLifecycleWriteTransaction(db.db, 'monitor_cancel_request', () => {
        const row = current()
        if (
          row.delivered_at ||
          db.getStructuredMailSendsForMessages([id]).length ||
          db.getOutstandingMailboxDelivery(row.to_handle)
        ) {
          throw new OrchestrationError(
            'invalid_argument',
            'Delivery may already be in progress. This request cannot be cancelled from the waiting list.'
          )
        }
        if (
          !notifyBotRequestOutcome(runtime, db, row, 'dropped', 'cancelled', undefined, (notify) =>
            notifications.push(notify)
          )
        ) {
          throw new OrchestrationError(
            'invalid_argument',
            'The sender could not be confirmed. Reconnect and try again.'
          )
        }
        db.recordBotRequestOutcome(id, 'dropped')
        db.markAsRead([id])
        return { result: 'cancelled' as const }
      })
      notifications.forEach((notify) => {
        try {
          notify()
        } catch (error) {
          console.warn('[orchestration] cancelled request sender nudge failed', error)
        }
      })
      return cancelled
    }
    const row = current()
    const bot = runtime.bots.list().find((entry) => entry.id === request.to_bot_id)
    const target = structuredMailboxCustody(row.to_handle, db)
    if (
      !bot ||
      bot.paused ||
      !runtime.bots.enabled() ||
      typeof target !== 'object' ||
      !host ||
      host !== getStructuredAgentSessionHost()
    ) {
      throw new OrchestrationError(
        'invalid_argument',
        'The receiving bot is unavailable or paused. Refresh to inspect it.'
      )
    }
    let resumed = false
    if (action === 'resume') {
      const fence = host.deps.store.getConversation(target.sessionId)?.currentFence
      if (fence === undefined) {
        throw new OrchestrationError(
          'invalid_argument',
          'The receiving conversation is unavailable.'
        )
      }
      const result = await host.queuedMessagesResume(
        { callerKey: 'trusted-local:monitor-recovery' },
        {
          envelope: {
            sessionId: target.sessionId,
            clientOperationId: operationId,
            expectedRuntimeFence: fence,
            payloadFingerprint: structuredAgentSessionPayloadFingerprint({
              method: 'agentSession.queuedMessagesResume',
              sessionId: target.sessionId,
              fields: {}
            })
          }
        }
      )
      if (!result.ok) {
        throw new OrchestrationError(result.refusal.code, result.refusal.message)
      }
      resumed = result.value.resumed
      host.wakeQueuedMessages(target.sessionId)
    }
    const pending = db.getMessageById(id)
    if (pending && !pending.read && !db.getBotRequestOutcome(id)) {
      runtime.notifyMessageArrived(pending.to_handle, pending.type)
    }
    return { result: action === 'resume' ? (resumed ? 'resumed' : 'unchanged') : 'queued' }
  })
}
