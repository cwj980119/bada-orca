import { z } from 'zod'

export const OrchestrationMonitorParams = z.object({})
export const OrchestrationMonitorMessageParams = z.object({ id: z.string().min(1).max(200) })

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
  runId: string
  task: MonitorTask | null
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
}

export type OrchestrationMonitorMessageDetail = {
  message: MonitorMessage
  body: string
  payload: string | null
}
