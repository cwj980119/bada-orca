import type { Translate } from '@/i18n/use-translate'
import type {
  MonitorExecutionState,
  MonitorRequestProgress
} from '../../../../shared/orchestration/orchestration-monitor'

const executions: Record<MonitorExecutionState, string> = {
  idle: 'Ready',
  starting: 'Starting CLI',
  working: 'Working',
  approval: 'Awaiting approval',
  answer: 'Awaiting input',
  paused: 'Paused',
  failed: 'Needs recovery',
  sleeping: 'At rest',
  unavailable: 'Not observed'
}
const stages: Record<MonitorRequestProgress['stage'], string> = {
  queued: 'Queued',
  starting: 'Starting CLI',
  blocked: 'Waiting for action',
  processing: 'Received',
  awaiting_response: 'Awaiting reply',
  completed: 'Reply recorded',
  failed: 'Needs recovery',
  uncertain: 'Delivery unconfirmed',
  cancelled: 'Delivery ended'
}
const reasons: Record<MonitorRequestProgress['reason'], string> = {
  queued: 'Waiting for the receiving bot to take this request.',
  starting: 'Starting the receiving CLI. The request is retained until it is ready.',
  paused: 'The receiving bot is paused. Resume it from bot settings before retrying.',
  approval: 'The receiving chat is waiting for approval. Open it to review the prompt.',
  answer: 'The receiving chat is waiting for input. Answer its question to continue.',
  busy: 'The receiving bot has work in progress. This request stays in its queue.',
  startup_failed: 'The receiving CLI did not become ready. Check the connection or retry.',
  previous_failure:
    'An earlier failure was recorded in the receiving chat. Inspect its state before continuing.',
  unavailable: 'The receiving session could not be confirmed. Check the host connection.',
  run_stopped: 'This work has stopped or reached its execution deadline. New delivery is blocked.',
  awaiting_response: 'The request was received. A reply has not been recorded yet.',
  unanswered:
    'The request ended without a reply. Review the conversation before assigning it again.',
  uncertain:
    'Delivery could not be confirmed. Automatic retry is withheld to avoid duplicate work.',
  completed: 'A reply to this request was recorded.',
  cancelled: 'This request was dropped before it was handled.'
}

export const executionLabel = (t: Translate, state: MonitorExecutionState) =>
  t(`orchestrationMonitor.executionStates.${state}`, executions[state])
export const progressLabel = (t: Translate, stage: MonitorRequestProgress['stage']) =>
  t(`orchestrationMonitor.progressStages.${stage}`, stages[stage])
export const progressReason = (t: Translate, reason: MonitorRequestProgress['reason']) =>
  t(`orchestrationMonitor.progressReasons.${reason}`, reasons[reason])
