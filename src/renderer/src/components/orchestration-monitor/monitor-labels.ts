import type { Translate } from '@/i18n/use-translate'
import { canonicalExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { getTranslatedExecutionHostLabel } from '@/runtime/hosts/display/execution-host-label'
import type { MonitorData } from './monitor-host-snapshot'

export function monitorParticipantHost(
  t: Translate,
  participant: MonitorData['participants'][number]
): string {
  const host = canonicalExecutionHostId(participant.executionHost)
  return host && host !== 'local'
    ? getTranslatedExecutionHostLabel(host, t)
    : participant.executionHost && !host
      ? participant.executionHost
      : participant.host.label
}

const labels = {
  connected: 'Connected',
  offline: 'Offline',
  paused: 'Paused',
  registered: 'Registered',
  unknown: 'Unknown',
  loading: 'Loading',
  ready: 'Ready',
  unsupported: 'Update required',
  bot: 'Bot',
  terminal: 'Terminal',
  external: 'External CLI',
  session: 'Chat',
  worker: 'Worker',
  pending: 'Pending',
  dispatched: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
  circuit_broken: 'Stopped after failures',
  answered: 'Answered',
  closed: 'Closed',
  posted: 'Reply posted',
  unanswered: 'Ended without reply',
  dropped: 'Dropped',
  status: 'Status',
  dispatch: 'Dispatch',
  worker_done: 'Worker report',
  merge_ready: 'Merge ready',
  escalation: 'Escalation',
  handoff: 'Handoff',
  decision_gate: 'Decision',
  question: 'Question',
  heartbeat: 'Heartbeat'
} as const

export function monitorLabel(t: Translate, value: string): string {
  if (value === 'error') {
    return t('orchestrationMonitor.labels.error', 'Unavailable')
  }
  return value in labels
    ? t(`orchestrationMonitor.labels.${value}`, labels[value as keyof typeof labels])
    : value
}

export function deliveryLabel(t: Translate, value: string): string {
  const fallback = {
    pending: 'Awaiting delivery',
    delivered: 'Delivered',
    read: 'Receipt acknowledged',
    audit: 'Audit record'
  }
  return value in fallback
    ? t(`orchestrationMonitor.delivery.${value}`, fallback[value as keyof typeof fallback])
    : value
}
