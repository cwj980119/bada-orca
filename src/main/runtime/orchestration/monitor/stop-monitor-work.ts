import { createHash } from 'node:crypto'
import type { OrcaRuntimeService } from '../../orca-runtime'
import type { MonitorWorkStopOutcome } from '../../../../shared/orchestration/orchestration-work-monitor'
import { stopWorkerAndHelpers } from '../../rpc/methods/orchestration/worker/worker-stop'
import { fenceRun, readRunControls, recordRunStopOutcomes } from '../db/runs/run-controls'
import { mapWithConcurrency } from '../../../../shared/concurrency/map-with-concurrency'
import { OrchestrationError } from '../orchestration-error'
import { readMonitorWork } from './monitor-work-read'

const active = new WeakMap<OrcaRuntimeService, Map<string, Promise<void>>>()

export async function stopMonitorWork(
  runtime: OrcaRuntimeService,
  runId: string,
  reason: 'user' | 'deadline' = 'user'
) {
  const db = runtime.getOrchestrationDb()
  fenceRun(db, runId, reason)
  const runs = active.get(runtime) ?? new Map<string, Promise<void>>()
  active.set(runtime, runs)
  let stopping = runs.get(runId)
  if (!stopping) {
    stopping = stopRunWorkers(runtime, runId).finally(() => runs.delete(runId))
    runs.set(runId, stopping)
  }
  await stopping
  return readMonitorWork(db, runId)
}

async function stopRunWorkers(runtime: OrcaRuntimeService, runId: string): Promise<void> {
  const db = runtime.getOrchestrationDb()
  const stoppedAt = readRunControls(db, runId).stoppedAt!
  const outcomes = new Map<string, MonitorWorkStopOutcome>()
  const processedRoots = new Set<string>()
  let after = ''
  for (;;) {
    const page = db.db
      .prepare(`SELECT d.id FROM dispatch_contexts d
      LEFT JOIN worker_dispatches w ON w.dispatch_id = d.id
      WHERE d.run_id = ? AND d.id > ? AND
      (d.status IN ('pending', 'dispatched') OR w.state IN
        ('starting', 'ready', 'start_unknown', 'stopping', 'stop_unknown'))
      ORDER BY d.id LIMIT 64`)
      .all(runId, after)
      .map((row) => ({ id: String(row.id) }))
    if (!page.length) {
      break
    }
    const roots = new Set<string>()
    for (const candidate of page) {
      let dispatch = db.getDispatchContextById(candidate.id)
      const seen = new Set<string>()
      while (dispatch?.creator_dispatch_id && !seen.has(dispatch.id)) {
        seen.add(dispatch.id)
        const parent = db.getDispatchContextById(dispatch.creator_dispatch_id)
        if (!parent || parent.run_id !== runId) {
          break
        }
        dispatch = parent
      }
      const id = dispatch?.id ?? candidate.id
      if (!processedRoots.has(id)) {
        roots.add(id)
        processedRoots.add(id)
      }
    }
    await mapWithConcurrency([...roots], 4, async (id) => {
      const worker = db.getWorkerDispatch(id)
      if (worker?.state === 'starting' && worker.runtime_epoch !== runtime.getRuntimeId()) {
        db.markWorkerStartUnknown(id, worker.stage, 'The runtime restarted during worker start.')
      }
      if (db.getWorkerDispatch(id)?.state === 'starting') {
        outcomes.set(id, { dispatchId: id, state: 'starting' })
        return
      }
      try {
        const requestId = `run-stop:${createHash('sha256').update(`${runId}:${stoppedAt}:${id}`).digest('hex')}`
        const receipt = await stopWorkerAndHelpers(runtime, id, {
          callerFingerprint: 'trusted-local:run-control',
          requestId,
          method: 'orchestration.workerStop',
          payloadHash: createHash('sha256')
            .update(JSON.stringify({ dispatch: id }))
            .digest('hex')
        })
        outcomes.set(id, {
          dispatchId: id,
          state: receipt.helperStopError
            ? 'unconfirmed'
            : receipt.alreadySettled
              ? 'finished'
              : receipt.state === 'stopped'
                ? 'stopped'
                : 'unconfirmed',
          detail: receipt.helperStopError ?? receipt.lastError ?? undefined
        })
        for (const helper of receipt.helpers ?? []) {
          outcomes.set(helper.dispatchId, {
            dispatchId: helper.dispatchId,
            state: helper.outcome === 'already_finished' ? 'finished' : helper.outcome,
            detail: helper.lastError ?? undefined
          })
        }
      } catch (error) {
        outcomes.set(id, {
          dispatchId: id,
          state:
            error instanceof OrchestrationError && error.code === 'terminal_kept_open'
              ? 'kept_open'
              : 'unconfirmed',
          detail: error instanceof Error ? error.message : String(error)
        })
      }
    })
    after = page.at(-1)!.id
  }
  const previous = db.db
    .prepare('SELECT stop_report FROM orchestration_run_controls WHERE run_id = ?')
    .get(runId)
  const earlier: MonitorWorkStopOutcome[] = previous ? JSON.parse(String(previous.stop_report)) : []
  for (const outcome of earlier) {
    if (!outcomes.has(outcome.dispatchId)) {
      const worker = db.getWorkerDispatch(outcome.dispatchId)
      const state =
        worker?.state === 'stopped'
          ? 'stopped'
          : worker && ['succeeded', 'failed', 'abandoned'].includes(worker.state)
            ? 'finished'
            : outcome.state
      outcomes.set(outcome.dispatchId, { ...outcome, state })
    }
  }
  recordRunStopOutcomes(db, runId, [...outcomes.values()])
}
