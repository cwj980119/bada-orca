import type {
  MonitorMessage,
  MonitorRecoveryAction,
  MonitorRequestProgress
} from '../../../../shared/orchestration/orchestration-monitor'
import type { MonitorSessionExecution } from './monitor-session-execution'
import type { StructuredSendAnswer } from '../../../native-chat/agent-session-journal/journal-mail-observation'

export function monitorRequestProgress(
  message: MonitorMessage,
  facts: MonitorSessionExecution,
  attempt: StructuredSendAnswer['kind'] | null,
  now = Date.now()
): MonitorRequestProgress {
  const since = message.deliveredAt ?? message.createdAt
  const result = (
    stage: MonitorRequestProgress['stage'],
    reason: MonitorRequestProgress['reason'],
    actions: MonitorRecoveryAction[] = []
  ): MonitorRequestProgress => ({
    stage,
    reason,
    actions,
    since,
    attention:
      ['blocked', 'failed', 'uncertain'].includes(stage) ||
      (['queued', 'awaiting_response'].includes(stage) && now - Date.parse(since) >= 300_000),
    ...(facts.execution.detail && ['startup_failed', 'previous_failure'].includes(reason)
      ? { detail: facts.execution.detail }
      : {})
  })
  if (message.outcome === 'answered' || message.outcome === 'posted') {
    return result('completed', 'completed')
  }
  if (message.outcome === 'dropped') {
    return result('cancelled', 'cancelled')
  }
  if (message.outcome === 'unanswered') {
    return result('failed', 'unanswered')
  }
  if (message.delivery === 'read') {
    return message.type === 'status'
      ? result('completed', 'completed')
      : result('awaiting_response', 'awaiting_response')
  }
  if (attempt === 'accepted') {
    return result('processing', 'busy')
  }
  if (attempt === 'unknown' || attempt === 'unreadable') {
    return result('uncertain', 'uncertain')
  }
  const actions: MonitorRecoveryAction[] =
    !attempt && message.delivery === 'pending' ? ['cancel'] : []
  const { state } = facts.execution
  if (state === 'paused') {
    return result('blocked', 'paused', actions)
  }
  if (state === 'unavailable') {
    return result('blocked', 'unavailable', actions)
  }
  if (state === 'starting') {
    return result('starting', 'starting', actions)
  }
  if (state === 'approval' || state === 'answer') {
    return result('blocked', state, actions)
  }
  if (facts.failureHeld) {
    return result('blocked', 'previous_failure', ['resume', ...actions])
  }
  if (state === 'failed') {
    return result('failed', facts.startupFailed ? 'startup_failed' : 'previous_failure', [
      'retry',
      ...actions
    ])
  }
  return result('queued', state === 'working' ? 'busy' : 'queued', ['retry', ...actions])
}
