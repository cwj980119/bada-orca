import { z } from 'zod'
import type { MonitorParticipant } from './orchestration-monitor'

export const MonitorWorksParams = z.object({})
export const MonitorWorkParams = z.object({ runId: z.string().min(1).max(200) })
export const MonitorWorkLimitsParams = MonitorWorkParams.extend({
  revision: z.number().int().nonnegative(),
  maxActiveWorkers: z.number().int().min(1).max(1000).nullable(),
  maxBotRequests: z.number().int().min(1).max(100000).nullable(),
  deadlineAt: z.string().datetime().nullable()
})

export type MonitorWorkLimits = {
  revision: number
  maxActiveWorkers: number | null
  maxBotRequests: number | null
  deadlineAt: string | null
  stoppedAt: string | null
  stopReason: 'user' | 'deadline' | null
}

export type MonitorWork = {
  id: string
  objective: string
  createdAt: string
  updatedAt: string
  coordinator: string | null
  tasks: { total: number; completed: number; failed: number }
  activeWorkers: number
  botRequests: number
  limits: MonitorWorkLimits
  stopOutcomes: MonitorWorkStopOutcome[]
}

export type MonitorWorkStopOutcome = {
  dispatchId: string
  state: 'stopped' | 'finished' | 'starting' | 'unconfirmed' | 'kept_open'
  detail?: string
}

export type MonitorWorkTask = {
  id: string
  parentId: string | null
  title: string
  spec: string
  specLimited: boolean
  status: string
  dependencies: string[]
  result: string | null
  resultLimited: boolean
  createdAt: string
  completedAt: string | null
  attempts: {
    id: string
    creatorId: string | null
    assignee: string | null
    participant?: MonitorParticipant
    status: string
    workerState: string | null
    host: string | null
    startedAt: string
    completedAt: string | null
    error: string | null
  }[]
}

export type MonitorWorksResult = { works: MonitorWork[]; limited: boolean }
export type MonitorWorkDetail = {
  work: MonitorWork
  tasks: MonitorWorkTask[]
  tasksLimited: boolean
  attemptsLimited: boolean
}
