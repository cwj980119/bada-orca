import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, it } from 'vitest'
import { OrchestrationDb } from '../orchestration-db'
import { createRootDispatch } from '../root-dispatch-test-fixture'
import { fenceRun, readRunControls, updateRunControls } from './run-controls'
import { readMonitorWorkDetail, readMonitorWorks } from '../../monitor/monitor-work-read'

let db: OrchestrationDb | undefined
afterEach(() => {
  db?.close()
  db = undefined
})

function setup() {
  db = new OrchestrationDb(':memory:')
  const run = db.createRun({
    objective: 'Ship search',
    coordinatorHandle: null,
    coordinatorPaneKey: null
  })
  const limits = {
    runId: run.id,
    revision: 0,
    maxActiveWorkers: null,
    maxBotRequests: null,
    deadlineAt: null
  }
  return { d: db, run, limits }
}

it('excludes the shared legacy mailbox from per-work history and stop controls', () => {
  const { d, run, limits } = setup()
  expect(readMonitorWorks(d).works.map((work) => work.id)).toEqual([run.id])
  expect(() =>
    updateRunControls(d, { ...limits, runId: 'run_legacy_local', maxActiveWorkers: 1 })
  ).toThrow('This Run changed')
  expect(() => fenceRun(d, 'run_legacy_local', 'user')).toThrow('Run no longer exists.')
})

it('reserves concurrent capacity before placement, releases failed starts, and isolates other Runs', () => {
  const { d, run, limits } = setup()
  updateRunControls(d, { ...limits, maxActiveWorkers: 1 })
  const start = () =>
    d.createStartingWorkerDispatch({
      taskRunId: run.id,
      taskSpec: 'Implement search',
      creator: { kind: 'system' },
      maxDepth: 10,
      startOptions: {}
    })
  const first = start()
  expect(() => start()).toThrow('Run concurrent worker limit reached.')
  const other = d.createTask({ runId: 'run_legacy_local', spec: 'Unrelated work' })
  expect(createRootDispatch(d, other.id, 'term_other').status).toBe('dispatched')
  d.failWorkerStart(first.dispatch.id, 'placement', 'Provider unavailable')
  expect(start().worker.state).toBe('starting')
})

it('counts admitted bot requests once, covers reservations, and rolls back refused mail', () => {
  const { d, run, limits } = setup()
  updateRunControls(d, { ...limits, maxBotRequests: 1 })
  const input = {
    rootKey: 'root',
    sendKey: 'send-review',
    fromBotId: 'lead',
    toBotId: 'review',
    purpose: 'handoff' as const,
    depth: 1,
    record: '{}',
    message: { runId: run.id, from: 'lead', to: 'review', subject: 'Review search' }
  }
  const sent = d.admitBotRequest(input)
  expect(sent.kind).toBe('sent')
  expect(d.admitBotRequest(input).kind).toBe('duplicate')
  expect(() => d.admitBotRequest({ ...input, sendKey: 'send-test', toBotId: 'test' })).toThrow(
    'Run bot request limit reached.'
  )
  d.reserveBotRequest({ ...input, sendKey: 'reserved-test', messageId: 'msg_reserved_test' })
  expect(() => d.admitReservedBotRequest({ ...input.message, id: 'msg_reserved_test' })).toThrow(
    'Run bot request limit reached.'
  )
  expect(d.getMessageById('msg_reserved_test')).toBeUndefined()
  expect(d.getAllMessagesForHandle('review').map((message) => message.subject)).toEqual([
    'Review search'
  ])
})

it('fences new work durably while allowing existing work to report its result', () => {
  const { d, run } = setup()
  const task = d.createTask({ runId: run.id, spec: 'Implement search' })
  const dispatch = createRootDispatch(d, task.id, 'term_search')
  fenceRun(d, run.id, 'user')
  expect(() =>
    d.createStartingWorkerDispatch({
      taskRunId: run.id,
      taskSpec: 'Extra work',
      creator: { kind: 'system' },
      maxDepth: 10,
      startOptions: {}
    })
  ).toThrow('Run is stopped or its execution deadline has passed.')
  expect(
    d.settleWorkerReport({
      taskId: task.id,
      dispatchId: dispatch.id,
      outcome: 'succeeded',
      result: 'Changed search.ts. Search regression passed.'
    }).action
  ).toBe('settled')
  const detail = readMonitorWorkDetail(d, run.id)
  expect(detail.work.limits).toMatchObject({ stopReason: 'user', revision: 1 })
  expect(detail.tasks[0]).toMatchObject({
    status: 'completed',
    result: 'Changed search.ts. Search regression passed.',
    attempts: [{ id: dispatch.id, status: 'completed' }]
  })
})

it('rejects stale edits so a settings save cannot clear an earlier stop', () => {
  const { d, run, limits } = setup()
  updateRunControls(d, { ...limits, maxActiveWorkers: 2 })
  expect(() => updateRunControls(d, { ...limits, maxActiveWorkers: 4 })).toThrow('This Run changed')
  fenceRun(d, run.id, 'user')
  expect(() => updateRunControls(d, { ...limits, revision: 2 })).toThrow('This Run changed')
  expect(readRunControls(d, run.id)).toMatchObject({
    revision: 2,
    maxActiveWorkers: 2,
    stopReason: 'user'
  })
})

it('retains limits across reopen and refuses starts after a persisted deadline', () => {
  const root = mkdtempSync(join(tmpdir(), 'orca-run-controls-'))
  const path = join(root, 'orchestration.db')
  let current = new OrchestrationDb(path)
  try {
    const run = current.createRun({
      objective: 'Deadline job',
      coordinatorHandle: null,
      coordinatorPaneKey: null
    })
    updateRunControls(current, {
      runId: run.id,
      revision: 0,
      maxActiveWorkers: 2,
      maxBotRequests: 10,
      deadlineAt: '2099-01-01T00:00:00.000Z'
    })
    current.db
      .prepare('UPDATE orchestration_run_controls SET deadline_at = ? WHERE run_id = ?')
      .run('2000-01-01T00:00:00.000Z', run.id)
    current.close()
    current = new OrchestrationDb(path)
    expect(readRunControls(current, run.id)).toMatchObject({
      maxActiveWorkers: 2,
      maxBotRequests: 10
    })
    expect(() =>
      current.createStartingWorkerDispatch({
        taskRunId: run.id,
        taskSpec: 'Too late',
        creator: { kind: 'system' },
        maxDepth: 10,
        startOptions: {}
      })
    ).toThrow('Run is stopped or its execution deadline has passed.')
  } finally {
    current.close()
    rmSync(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
