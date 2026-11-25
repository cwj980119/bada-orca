import type {
  MonitorWork,
  MonitorWorkDetail,
  MonitorWorksResult,
  MonitorWorkTask
} from '../../../../shared/orchestration/orchestration-work-monitor'
import type { OrchestrationDb } from '../db/orchestration-db'
import type { DispatchContextRow, RunRow, TaskRow } from '../db/orchestration-records'
import { readRunControls, readRunStopOutcomes } from '../db/runs/run-controls'
import { OrchestrationError } from '../orchestration-error'
import { exposeUtcTimestamp } from '../db/utc-timestamp'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { createMonitorRead } from './orchestration-monitor-read'

export function readRuntimeMonitorWork(
  runtime: OrcaRuntimeService,
  runId: string
): MonitorWorkDetail {
  const read = createMonitorRead(runtime)
  const detail = readMonitorWorkDetail(read.db, runId)
  for (const task of detail.tasks) {
    for (const attempt of task.attempts) {
      attempt.participant = read.participants.get(read.resolve(`dispatch:${attempt.id}`))
    }
  }
  return detail
}

export function readMonitorWork(db: OrchestrationDb, runId: string): MonitorWork {
  const run = db.getRun(runId)
  if (!run || run.legacy) {
    throw new OrchestrationError('invalid_argument', 'Run no longer exists.')
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: COUNT and the coalesced SUM projections return these numeric fields.
  const counts = db.db
    .prepare(`SELECT COUNT(*) AS total,
    COALESCE(SUM(status = 'completed'), 0) AS completed,
    COALESCE(SUM(status = 'failed'), 0) AS failed FROM tasks WHERE run_id = ?`)
    .get(runId) as MonitorWork['tasks']
  const workers = db.db
    .prepare(`SELECT COUNT(*) AS count FROM dispatch_contexts d
    LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id WHERE d.run_id = ? AND
    (w.state IN ('starting', 'ready', 'start_unknown', 'stopping', 'stop_unknown') OR
      (w.dispatch_id IS NULL AND d.status IN ('pending', 'dispatched') AND d.capability_revoked_at IS NULL))`)
    .get(runId)
  const requests = db.db
    .prepare(`SELECT COUNT(*) AS count FROM bot_requests b
    JOIN messages m ON m.id = b.message_id WHERE m.run_id = ?`)
    .get(runId)
  return {
    id: run.id,
    objective: run.objective,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    coordinator: run.coordinator_handle,
    tasks: counts,
    activeWorkers: Number(workers?.count ?? 0),
    botRequests: Number(requests?.count ?? 0),
    limits: readRunControls(db, runId),
    stopOutcomes: readRunStopOutcomes(db, runId)
  }
}

export function readMonitorWorks(db: OrchestrationDb): MonitorWorksResult {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: The projection selects the Run schema's TEXT id.
  const runs = db.db
    .prepare(`SELECT id FROM runs WHERE legacy = 0 ORDER BY
    EXISTS(SELECT 1 FROM dispatch_contexts d WHERE d.run_id = runs.id
      AND d.status IN ('pending', 'dispatched')) DESC, updated_at DESC, id DESC LIMIT 101`)
    .all() as Pick<RunRow, 'id'>[]
  return {
    works: runs.slice(0, 100).map(({ id }) => readMonitorWork(db, id)),
    limited: runs.length > 100
  }
}

export function readMonitorWorkDetail(db: OrchestrationDb, runId: string): MonitorWorkDetail {
  const work = readMonitorWork(db, runId)
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: Task columns retain their schema types; the two LENGTH comparisons return integers.
  const rows = db.db
    .prepare(`SELECT id, parent_id, task_title, display_name, status, deps,
    SUBSTR(spec, 1, 16000) AS spec, LENGTH(spec) > 16000 AS spec_limited,
    SUBSTR(result, 1, 32000) AS result,
    LENGTH(result) > 32000 AS result_limited, created_at, completed_at
    FROM tasks WHERE run_id = ? ORDER BY created_at, id LIMIT 301`)
    .all(runId) as (TaskRow & { result_limited: number; spec_limited: number })[]
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: Dispatch columns retain their schema types; LEFT JOIN adds nullable worker state and host name.
  const attempts = db.db
    .prepare(`SELECT d.*, w.state AS worker_state,
    f.environment_name AS environment_name FROM dispatch_contexts d
    LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id
    LEFT JOIN federated_dispatches f ON f.dispatch_id = d.id
    WHERE d.run_id = ? ORDER BY d.created_at DESC, d.id DESC LIMIT 601`)
    .all(runId) as (DispatchContextRow & {
    worker_state: string | null
    environment_name: string | null
  })[]
  const tasks: MonitorWorkTask[] = rows.slice(0, 300).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    title: row.display_name || row.task_title || row.id,
    spec: row.spec,
    specLimited: Boolean(row.spec_limited),
    status: row.status,
    dependencies: JSON.parse(row.deps),
    result: row.result,
    resultLimited: Boolean(row.result_limited),
    createdAt: exposeUtcTimestamp(row.created_at)!,
    completedAt: exposeUtcTimestamp(row.completed_at),
    attempts: attempts
      .slice(0, 600)
      .filter((attempt) => attempt.task_id === row.id)
      .map((attempt) => ({
        id: attempt.id,
        creatorId: attempt.creator_dispatch_id,
        assignee: attempt.assignee_handle,
        status: attempt.status,
        workerState: attempt.worker_state,
        host: attempt.environment_name,
        startedAt: exposeUtcTimestamp(attempt.dispatched_at ?? attempt.created_at)!,
        completedAt: exposeUtcTimestamp(attempt.completed_at),
        error: attempt.last_failure
      }))
  }))
  for (const task of tasks) {
    if (task.parentId) {
      continue
    }
    const creatorId = task.attempts.at(-1)?.creatorId
    const creator = creatorId ? db.getDispatchContextById(creatorId) : undefined
    if (creator?.run_id === runId && creator.task_id !== task.id) {
      task.parentId = creator.task_id
    }
  }
  return { work, tasks, tasksLimited: rows.length > 300, attemptsLimited: attempts.length > 600 }
}
