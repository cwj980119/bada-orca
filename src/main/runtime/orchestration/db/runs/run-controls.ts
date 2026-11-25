import type { z } from 'zod'
import type {
  MonitorWorkLimits,
  MonitorWorkLimitsParams,
  MonitorWorkStopOutcome
} from '../../../../../shared/orchestration/orchestration-work-monitor'
import type { OrchestrationDb } from '../orchestration-db'
import { OrchestrationError } from '../../orchestration-error'

type ControlRow = {
  revision: number
  max_active_workers: number | null
  max_bot_requests: number | null
  deadline_at: string | null
  stopped_at: string | null
  stop_reason: 'user' | 'deadline' | null
  stop_report: string
}

export function readRunControls(db: OrchestrationDb, runId: string): MonitorWorkLimits {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: The projection is the run-controls schema on this database.
  const row = db.db
    .prepare('SELECT * FROM orchestration_run_controls WHERE run_id = ?')
    .get(runId) as ControlRow | undefined
  return {
    revision: row?.revision ?? 0,
    maxActiveWorkers: row?.max_active_workers ?? null,
    maxBotRequests: row?.max_bot_requests ?? null,
    deadlineAt: row?.deadline_at ?? null,
    stoppedAt: row?.stopped_at ?? null,
    stopReason: row?.stop_reason ?? null
  }
}

export function runIsClosed(db: OrchestrationDb, runId: string | null): boolean {
  if (!runId) {
    return false
  }
  return Boolean(
    db.db
      .prepare(`SELECT 1 FROM orchestration_run_controls WHERE run_id = ?
      AND (stopped_at IS NOT NULL OR julianday(deadline_at) <= julianday('now'))`)
      .get(runId)
  )
}

export function updateRunControls(
  db: OrchestrationDb,
  params: z.infer<typeof MonitorWorkLimitsParams>
): MonitorWorkLimits {
  if (params.deadlineAt && Date.parse(params.deadlineAt) <= Date.now()) {
    throw new OrchestrationError('invalid_argument', 'Choose an execution deadline in the future.')
  }
  const result = db.db
    .prepare(`INSERT INTO orchestration_run_controls
    (run_id, revision, max_active_workers, max_bot_requests, deadline_at, updated_at)
    SELECT r.id, 1, ?, ?, ?, ? FROM runs r WHERE r.id = ? AND r.legacy = 0
    AND (? = 0 OR EXISTS (SELECT 1 FROM orchestration_run_controls c WHERE c.run_id = r.id))
    ON CONFLICT(run_id) DO UPDATE SET revision = revision + 1,
      max_active_workers = excluded.max_active_workers, max_bot_requests = excluded.max_bot_requests,
      deadline_at = excluded.deadline_at, updated_at = excluded.updated_at
    WHERE orchestration_run_controls.revision = ? AND stopped_at IS NULL
      AND (deadline_at IS NULL OR julianday(deadline_at) > julianday('now'))`)
    .run(
      params.maxActiveWorkers,
      params.maxBotRequests,
      params.deadlineAt,
      new Date().toISOString(),
      params.runId,
      params.revision,
      params.revision
    )
  if (Number(result.changes) !== 1) {
    throw new OrchestrationError(
      'invalid_argument',
      'This Run changed or has stopped. Refresh before changing its limits.'
    )
  }
  db.runControlChanged?.()
  return readRunControls(db, params.runId)
}

export function fenceRun(db: OrchestrationDb, runId: string, reason: 'user' | 'deadline'): void {
  if (db.getRun(runId)?.legacy !== 0) {
    throw new OrchestrationError('invalid_argument', 'Run no longer exists.')
  }
  const now = new Date().toISOString()
  db.db
    .prepare(`INSERT INTO orchestration_run_controls
    (run_id, revision, stopped_at, stop_reason, updated_at) VALUES (?, 1, ?, ?, ?)
    ON CONFLICT(run_id) DO UPDATE SET revision = revision + 1,
    stopped_at = excluded.stopped_at, stop_reason = excluded.stop_reason,
    updated_at = excluded.updated_at WHERE stopped_at IS NULL`)
    .run(runId, now, reason, now)
  db.runControlChanged?.()
}

export function readRunStopOutcomes(db: OrchestrationDb, runId: string): MonitorWorkStopOutcome[] {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: This schema stores stop_report as TEXT.
  const row = db.db
    .prepare('SELECT stop_report FROM orchestration_run_controls WHERE run_id = ?')
    .get(runId) as Pick<ControlRow, 'stop_report'> | undefined
  return row ? JSON.parse(row.stop_report) : []
}

export function recordRunStopOutcomes(
  db: OrchestrationDb,
  runId: string,
  outcomes: MonitorWorkStopOutcome[]
): void {
  db.db
    .prepare(
      'UPDATE orchestration_run_controls SET stop_report = ?, updated_at = ? WHERE run_id = ?'
    )
    .run(JSON.stringify(outcomes), new Date().toISOString(), runId)
}
