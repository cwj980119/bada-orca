import { afterEach, expect, it, vi } from 'vitest'
import { createOrchestrationWorkerReleaseHarness } from '../../rpc/methods/orchestration/worker/testing/worker-release.test-support'
import { stopMonitorWork } from './stop-monitor-work'
import { readMonitorWork } from './monitor-work-read'
import { RunControlSupervisor } from './run-control-supervisor'

const h = createOrchestrationWorkerReleaseHarness()
afterEach(() => h.cleanup())

it('stops only the selected Run and blocks later starts', async () => {
  h.setup()
  const worker = await h.startWorker()
  const unrelated = h.db.createRun({
    objective: 'Unrelated Run',
    coordinatorHandle: 'term_other',
    coordinatorPaneKey: null
  })
  const stopped = await stopMonitorWork(h.runtime, h.activeRunId)
  expect(h.db.getWorkerDispatch(worker.dispatchId)?.state).toBe('stopped')
  expect(stopped).toMatchObject({
    activeWorkers: 0,
    limits: { stopReason: 'user' },
    stopOutcomes: [{ dispatchId: worker.dispatchId, state: 'stopped' }]
  })
  expect(readMonitorWork(h.db, unrelated.id).limits.stoppedAt).toBeNull()
  await expect(h.startWorker()).rejects.toThrow(
    'Run is stopped or its execution deadline has passed.'
  )
})

it('preserves an unknown process stop and keeps new work fenced', async () => {
  h.setup()
  const worker = await h.startWorker()
  h.inspectProcessLiveness.mockResolvedValue('unverifiable')
  vi.mocked(h.runtime.closeTerminal).mockRejectedValue(new Error('Terminal host unreachable'))
  const result = await stopMonitorWork(h.runtime, h.activeRunId)
  expect(result.limits.stoppedAt).not.toBeNull()
  expect(result.stopOutcomes).toEqual([
    expect.objectContaining({ dispatchId: worker.dispatchId, state: 'unconfirmed' })
  ])
})

it('stops a root that finishes starting after the Run was fenced', async () => {
  h.setup()
  const entered = h.deferred<void>()
  const release = h.deferred<void>()
  const wait = vi.mocked(h.runtime.waitForTerminal).getMockImplementation()!
  vi.mocked(h.runtime.waitForTerminal).mockImplementationOnce(async (...args) => {
    entered.resolve()
    await release.promise
    return wait(...args)
  })
  const starting = h.startWorker()
  await entered.promise
  const stopped = await stopMonitorWork(h.runtime, h.activeRunId)
  expect(stopped.stopOutcomes[0]?.state).toBe('starting')
  release.resolve()
  const worker = await starting
  expect(h.db.getWorkerDispatch(worker.dispatchId)?.state).toBe('stopped')
})

it('enforces a due execution deadline without opening the monitor', async () => {
  h.setup()
  const worker = await h.startWorker()
  h.db.db
    .prepare(`INSERT INTO orchestration_run_controls (run_id, deadline_at, updated_at)
    VALUES (?, '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z')`)
    .run(h.activeRunId)
  const supervisor = new RunControlSupervisor(h.db, (runId, reason) =>
    stopMonitorWork(h.runtime, runId, reason)
  )
  try {
    await supervisor.reconcile()
    expect(h.db.getWorkerDispatch(worker.dispatchId)?.state).toBe('stopped')
    expect(readMonitorWork(h.db, h.activeRunId).limits.stopReason).toBe('deadline')
  } finally {
    supervisor.close()
  }
})
