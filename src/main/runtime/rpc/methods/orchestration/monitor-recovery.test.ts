import { afterEach, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from './rpc-test-harness'
import { mintAgentSessionOperationId } from '../../../orchestration/mailbox/structured-pointer/structured-pointer-operation-id'
import {
  installSenderHost,
  removeSenderHost
} from './messaging/bot-request-sender-host.test-fixture'

const h = createOrchestrationRpcHarness()
const sender = 'orca_session_id:11111111-1111-4111-8111-111111111111'
afterEach(() => {
  removeSenderHost()
  h.cleanup()
})

function setup() {
  const state = h.setup(false)
  vi.spyOn(state.runtime, 'ensureStructuredAgentSessionHost').mockImplementation(async () =>
    installSenderHost(['11111111-1111-4111-8111-111111111111'])
  )
  vi.spyOn(state.runtime, 'listTerminals').mockResolvedValue({
    terminals: [],
    totalCount: 0,
    truncated: false
  })
  const admission = state.db.admitBotRequest({
    rootKey: 'root',
    fromBotId: 'lead',
    toBotId: 'review',
    purpose: 'question',
    depth: 1,
    record: JSON.stringify({
      fromBotId: 'lead',
      fromBotName: 'Lead',
      toBotId: 'review',
      toBotName: 'Review',
      purpose: 'question',
      depth: 1,
      askers: [{ kind: 'owner' }],
      request: 'Review',
      conversation: null
    }),
    message: { from: sender, to: 'term_review', subject: 'Review', type: 'question' }
  })
  if (admission.kind !== 'sent') {
    throw new Error('Request was not admitted')
  }
  const ctx = { ...state.ctx, caller: { kind: 'desktop' as const } }
  return {
    ...state,
    ctx,
    id: admission.message.id,
    recover: (action: string) =>
      h.call(
        'orchestration.monitorRecover',
        {
          id: admission.message.id,
          action,
          operationId: mintAgentSessionOperationId(1_795_585_200_000)
        },
        ctx
      )
  }
}

it('cancels only unadmitted mail and tells its sender once, including replay', async () => {
  const { db, id, recover } = setup()
  await expect(recover('cancel')).resolves.toEqual({ result: 'cancelled' })
  expect(db.getMessageById(id)).toMatchObject({ read: 1, delivered_at: null })
  expect(db.getBotRequestOutcome(id)).toBe('dropped')
  const notices = db.getAllMessagesForHandle(sender)
  expect(notices.map((row) => row.subject)).toEqual(['Re: Review'])
  await expect(recover('cancel')).resolves.toEqual({ result: 'cancelled' })
  expect(db.getAllMessagesForHandle(sender)).toEqual(notices)
})

it('refuses cancellation after a delivery reservation without changing its custody', async () => {
  const { db, id, recover } = setup()
  db.reserveStructuredMailSend({
    mailbox_handle: 'term_review',
    message_id: id,
    session_id: 'session',
    operation_id: 'attempt',
    minted_at_ms: 1_795_585_200_000
  })
  await expect(recover('cancel')).rejects.toThrow()
  expect(db.getMessageById(id)).toMatchObject({ read: 0 })
  expect(db.getBotRequestOutcome(id)).toBeNull()
  expect(db.getStructuredMailSend('term_review', id)?.operation_id).toBe('attempt')
})

it('does not reassign an already received request', async () => {
  const { db, id, recover } = setup()
  db.markAsRead([id])
  await expect(recover('retry')).resolves.toEqual({ result: 'unchanged' })
  expect(db.getMessageById(id)).toMatchObject({ read: 1, to_handle: 'term_review' })
  expect(db.getBotRequestOutcome(id)).toBeNull()
})

it('retains old pending requests even when newer unrelated traffic fills recent history', async () => {
  const { db, ctx, id } = setup()
  for (let index = 0; index < 205; index++) {
    db.insertMessage({ from: 'term_one', to: 'term_two', subject: `Update ${index}` })
  }
  const snapshot = await h.call('orchestration.monitor', {}, ctx)
  expect(snapshot).not.toMatchObject({
    messages: expect.arrayContaining([expect.objectContaining({ id })])
  })
  expect(snapshot).toMatchObject({ requests: [expect.objectContaining({ id })] })
  expect(db.getMessageById(id)?.read).toBe(0)
})

it('refuses recovery from an agent CLI', async () => {
  const { ctx, id } = setup()
  await expect(
    h.call(
      'orchestration.monitorRecover',
      { id, action: 'cancel', operationId: mintAgentSessionOperationId(1_795_585_200_000) },
      { ...ctx, caller: { kind: 'local-cli' } }
    )
  ).rejects.toThrow('Recover bot requests')
})
