import { afterEach, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from './rpc-test-harness'
import { fenceRun } from '../../../orchestration/db/runs/run-controls'
import { botMailOwner } from '../../../../bots/bot-group-runtime'
import { ownerAdjustedOwed } from '../../../orchestration/structured-mail-owner-narrowing'
import { createStructuredMailboxPointerHost } from '../../../orchestration/mailbox/structured-pointer/structured-mailbox-pointer-host'

const h = createOrchestrationRpcHarness()
afterEach(() => h.cleanup())

it('refuses agents access to work history and execution controls', async () => {
  const { ctx, activeRunId } = h.setup()
  const agent = { ...ctx, caller: { kind: 'local-cli' as const } }
  for (const method of [
    'orchestration.monitorWorks',
    'orchestration.monitorWork',
    'orchestration.monitorWorkLimits',
    'orchestration.monitorWorkStop'
  ]) {
    await expect(
      h.call(
        method,
        {
          runId: activeRunId,
          revision: 0,
          maxActiveWorkers: null,
          maxBotRequests: null,
          deadlineAt: null
        },
        agent
      )
    ).rejects.toThrow('Manage work from the orchestration monitor in Orca.')
  }
})

it('shows stopped requests as blocked and withholds retry without consuming them', async () => {
  const { ctx, runtime, db, activeRunId } = h.setup()
  vi.spyOn(runtime, 'listTerminals').mockResolvedValue({
    terminals: [],
    totalCount: 0,
    truncated: false
  })
  const admission = db.admitBotRequest({
    rootKey: 'search',
    fromBotId: 'lead',
    toBotId: 'review',
    purpose: 'handoff',
    depth: 1,
    record: '{}',
    message: { from: 'term_lead', to: 'term_review', subject: 'Review search', runId: activeRunId }
  })
  if (admission.kind !== 'sent') {
    throw new Error('Expected a new request')
  }
  fenceRun(db, activeRunId!, 'user')
  const snapshot = await h.call(
    'orchestration.monitor',
    {},
    { ...ctx, caller: { kind: 'desktop' } }
  )
  expect(snapshot).toMatchObject({
    requests: [
      expect.objectContaining({
        id: admission.message.id,
        progress: expect.objectContaining({
          stage: 'blocked',
          reason: 'run_stopped',
          actions: ['cancel']
        })
      })
    ]
  })
  const host = createStructuredMailboxPointerHost(botMailOwner(runtime))
  expect(ownerAdjustedOwed('owed', host, 'recipient-session', [admission.message.id], db)).toBe(
    'unavailable'
  )
  const report = db.insertMessage({
    from: 'term_review',
    to: 'term_lead',
    subject: 'Existing result',
    type: 'worker_done'
  })
  expect(ownerAdjustedOwed('owed', host, 'recipient-session', [report.id], db)).toBe('owed')
  expect(db.getMessageById(admission.message.id)).toMatchObject({ read: 0, delivered_at: null })
})
