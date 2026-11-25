import { z } from 'zod'

export const OrchestrationMonitorParams = z.object({})
export const OrchestrationMonitorMessageParams = z.object({ id: z.string().min(1).max(200) })
export const OrchestrationMonitorRecoverParams = OrchestrationMonitorMessageParams.extend({
  action: z.enum(['retry', 'resume', 'cancel']),
  operationId: z.string().regex(/^\d{13}-[a-f0-9]{32}$/)
})

export type MonitorRecoveryAction = z.infer<typeof OrchestrationMonitorRecoverParams>['action']
export type MonitorExecutionState =
  | 'idle'
  | 'starting'
  | 'working'
  | 'approval'
  | 'answer'
  | 'paused'
  | 'failed'
  | 'sleeping'
  | 'unavailable'
export type MonitorExecution = {
  state: MonitorExecutionState
  observedAt: string
  detail?: string
}
export type MonitorRequestProgress = {
  stage:
    | 'queued'
    | 'starting'
    | 'blocked'
    | 'processing'
    | 'awaiting_response'
    | 'completed'
    | 'failed'
    | 'uncertain'
    | 'cancelled'
  reason:
    | 'queued'
    | 'starting'
    | 'paused'
    | 'approval'
    | 'answer'
    | 'busy'
    | 'startup_failed'
    | 'previous_failure'
    | 'unavailable'
    | 'awaiting_response'
    | 'unanswered'
    | 'run_stopped'
    | 'uncertain'
    | 'completed'
    | 'cancelled'
  actions: MonitorRecoveryAction[]
  attention: boolean
  since: string
  detail?: string
}
export type MonitorRecoveryResult = { result: 'queued' | 'resumed' | 'cancelled' | 'unchanged' }

export type MonitorParticipant = {
  id: string
  address: string
  name: string
  kind: 'bot' | 'terminal' | 'external' | 'session' | 'worker' | 'unknown'
  agent: string | null
  model: string | null
  executionHost: string | null
  state: 'connected' | 'offline' | 'paused' | 'registered' | 'unknown'
  cwd: string | null
  avatar?: string | null
  execution?: MonitorExecution
}

export type MonitorTask = {
  id: string
  title: string
  status: string
  dispatchStatus: string | null
}

export type MonitorMessage = {
  id: string
  from: string
  to: string
  fromAddress: string
  toAddress: string
  subject: string
  preview: string
  type: string
  priority: string
  createdAt: string
  deliveredAt: string | null
  delivery: 'pending' | 'delivered' | 'read' | 'audit'
  question: 'pending' | 'answered' | 'closed' | null
  outcome: 'answered' | 'posted' | 'unanswered' | 'dropped' | null
  threadId: string | null
  conversationId?: string | null
  runId: string
  workRunId?: string
  task: MonitorTask | null
  progress?: MonitorRequestProgress
}

export type MonitorAssignment = {
  id: string
  from: string
  to: string
  task: MonitorTask
}

export type OrchestrationMonitorSnapshot = {
  capturedAt: string
  participants: MonitorParticipant[]
  messages: MonitorMessage[]
  assignments: MonitorAssignment[]
  limits: { messages: boolean; assignments: boolean; participants: boolean }
  omittedTerminalHosts: string[]
  requests?: MonitorMessage[]
  requestsLimited?: boolean
}

export type OrchestrationMonitorMessageDetail = {
  message: MonitorMessage
  body: string
  payload: string | null
}
