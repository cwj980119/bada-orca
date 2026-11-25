import type { Translate } from '@/i18n/use-translate'
import type { MonitorWork } from '../../../../shared/orchestration/orchestration-work-monitor'

export function monitorWorkLabel(t: Translate, state: string): string {
  switch (state) {
    case 'pending':
      return t('orchestrationMonitor.work.status.pending', 'Waiting')
    case 'ready':
      return t('orchestrationMonitor.work.status.ready', 'Ready')
    case 'dispatched':
      return t('orchestrationMonitor.work.status.dispatched', 'Working')
    case 'completed':
      return t('orchestrationMonitor.work.status.completed', 'Completed')
    case 'failed':
      return t('orchestrationMonitor.work.status.failed', 'Failed')
    case 'blocked':
      return t('orchestrationMonitor.work.status.blocked', 'Blocked')
    case 'circuit_broken':
      return t('orchestrationMonitor.work.status.circuit_broken', 'Suspended')
    case 'starting':
      return t('orchestrationMonitor.work.status.starting', 'Starting')
    case 'start_unknown':
      return t('orchestrationMonitor.work.status.start_unknown', 'Start unconfirmed')
    case 'stopping':
      return t('orchestrationMonitor.work.status.stopping', 'Stopping')
    case 'stop_unknown':
      return t('orchestrationMonitor.work.status.stop_unknown', 'Stop unconfirmed')
    case 'stopped':
      return t('orchestrationMonitor.work.status.stopped', 'Stopped')
    case 'succeeded':
      return t('orchestrationMonitor.work.status.succeeded', 'Completed')
    case 'abandoned':
      return t('orchestrationMonitor.work.status.abandoned', 'Released')
    case 'active':
      return t('orchestrationMonitor.work.status.active', 'In progress')
    case 'recorded':
      return t('orchestrationMonitor.work.status.recorded', 'Recorded')
    case 'finished':
      return t('orchestrationMonitor.work.status.finished', 'Already finished')
    case 'unconfirmed':
      return t('orchestrationMonitor.work.status.unconfirmed', 'Stop unconfirmed')
    case 'kept_open':
      return t('orchestrationMonitor.work.status.kept_open', 'Kept open')
    default:
      return state
  }
}

export function monitorWorkState(work: MonitorWork): string {
  if (work.limits.stoppedAt) {
    return work.activeWorkers ||
      work.stopOutcomes.some((item) =>
        ['starting', 'unconfirmed', 'kept_open'].includes(item.state)
      )
      ? 'stop_unknown'
      : 'stopped'
  }
  if (work.activeWorkers) {
    return 'active'
  }
  if (work.tasks.failed) {
    return 'failed'
  }
  if (work.tasks.total && work.tasks.completed === work.tasks.total) {
    return 'completed'
  }
  return 'recorded'
}
