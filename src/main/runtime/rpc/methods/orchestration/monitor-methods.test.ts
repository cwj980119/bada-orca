import { afterEach, expect, it, vi } from 'vitest'
import { createOrchestrationRpcHarness } from './rpc-test-harness'
import { externalAgents } from '../../../orchestration/external-clients/external-agent-registry'
import { createRootDispatch } from '../../../orchestration/db/root-dispatch-test-fixture'
import { makeTestBot } from '../../../../bots/bot.test-fixture'
import type {
  OrchestrationMonitorSnapshot,
  OrchestrationMonitorMessageDetail
} from '../../../../../shared/orchestration/orchestration-monitor'

const h = createOrchestrationRpcHarness()
afterEach(() => h.cleanup())

function setup() {
  const state = h.setup()
  vi.spyOn(state.runtime, 'listTerminals').mockResolvedValue({
    terminals: [],
    totalCount: 0,
    truncated: false
  })
  const ctx = { ...state.ctx, caller: { kind: 'desktop' as const } }
  return {
    ...state,
    ctx,
    read: () => h.call('orchestration.monitor', {}, ctx) as Promise<OrchestrationMonitorSnapshot>,
    detail: (id: string) =>
      h.call(
        'orchestration.monitorMessage',
        { id },
        ctx
      ) as Promise<OrchestrationMonitorMessageDetail>
  }
}

it('observes delivery, unanswered questions, and unfinished work without consuming mail', async () => {
  const { db, activeRunId, read, detail } = setup()
  const task = db.createTask({ spec: 'Review internal change' })
  const dispatch = createRootDispatch(db, task.id, 'term_worker')
  const { message } = db.createQuestion({
    runId: activeRunId!,
    dispatchId: dispatch.id,
    askerHandle: 'term_worker',
    question: 'Which branch?'
  })
  const pending = await read()
  expect(pending.messages.find((item) => item.id === message.id)).toMatchObject({
    delivery: 'pending',
    question: 'pending',
    task: { status: 'dispatched' }
  })
  expect(db.getMessageById(message.id)).toMatchObject({ read: 0, delivered_at: null })
  const batch = db.getOrCreateRunDelivery({ runId: activeRunId!, consumerGeneration: 1 })!
  await detail(message.id)
  expect(db.hasOutstandingRunDelivery(activeRunId!)).toBe(true)
  db.acknowledgeRunDelivery({
    runId: activeRunId!,
    consumerGeneration: 1,
    deliveryId: batch.delivery.id
  })
  const acknowledged = await read()
  expect(acknowledged.messages.find((item) => item.id === message.id)).toMatchObject({
    delivery: 'read',
    question: 'pending',
    task: { status: 'dispatched' }
  })
  expect(db.getDispatchContextById(dispatch.id)?.status).toBe('dispatched')
  expect(db.getQuestion(message.id)?.status).toBe('pending')
})

it('names disconnected external clients without renewing their lease or exposing credentials', async () => {
  const { runtime, db, read } = setup()
  const registry = externalAgents(runtime)
  const client = registry.register({
    agent: 'opencode',
    name: 'Remote reviewer',
    cwd: '/work/review'
  })
  registry.disconnect(client)
  db.insertMessage({ from: client.address, to: 'term_coord', subject: 'Waiting' })
  const snapshot = await read()
  expect(
    snapshot.participants.find((participant) => participant.id === client.address)
  ).toMatchObject({
    kind: 'external',
    state: 'offline',
    name: 'Remote reviewer',
    agent: 'opencode'
  })
  expect(registry.connected(client.address)).toBe(false)
  expect(registry.find(client.address)?.last_seen).toBe(0)
  expect(JSON.stringify(snapshot)).not.toContain(client.token)
  expect(JSON.stringify(snapshot)).not.toContain('token_hash')
})

it('joins a bot mailbox and its home chat while keeping terminal participants distinct', async () => {
  const { runtime, db, read } = setup()
  const session = 'orca_session_id:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const bot = makeTestBot({
    chatSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    launch: { model: 'internal-code-model' }
  })
  vi.spyOn(runtime.bots, 'list').mockReturnValue([bot])
  db.insertMessage({ from: `bot:${bot.id}`, to: 'term_review', subject: 'Review' })
  db.insertMessage({ from: 'term_review', to: session, subject: 'Result' })
  const snapshot = await read()
  const outbound = snapshot.messages.find((item) => item.subject === 'Review')!
  const inbound = snapshot.messages.find((item) => item.subject === 'Result')!
  expect(outbound.from).toBe('bot:bot-1')
  expect(inbound.to).toBe('bot:bot-1')
  expect(snapshot.participants.find((participant) => participant.id === 'bot:bot-1')).toMatchObject(
    { kind: 'bot', model: 'internal-code-model', state: 'registered' }
  )
  expect(snapshot.participants.find((participant) => participant.id === 'term_review')?.kind).toBe(
    'terminal'
  )
})

it('bounds recent traffic and reads the original body only on request', async () => {
  const { db, read, detail } = setup()
  for (let index = 0; index < 205; index++) {
    db.insertMessage({
      id: `monitor_${index}`,
      from: 'term_coord',
      to: 'term_worker',
      subject: `Message ${index}`,
      body: 'original body '.repeat(80)
    })
  }
  const snapshot = await read()
  expect(snapshot.messages).toHaveLength(200)
  expect(snapshot.limits.messages).toBe(true)
  expect(snapshot.messages[0].id).toBe('monitor_204')
  expect(snapshot.messages.at(-1)?.id).toBe('monitor_5')
  expect(snapshot.messages[0].preview).toHaveLength(300)
  expect((await detail('monitor_204')).body).toBe('original body '.repeat(80))
  expect(db.getMessageById('monitor_204')?.read).toBe(0)
})

it('shows recorded SSH worker placement without claiming the remote process is connected', async () => {
  const { db, read } = setup()
  const task = db.createTask({ spec: 'Inspect remote build' })
  const dispatch = createRootDispatch(db, task.id, 'term_remote')
  db.db
    .prepare('UPDATE dispatch_contexts SET host_scope = ? WHERE id = ?')
    .run(JSON.stringify({ kind: 'ssh', targetId: 'review-server' }), dispatch.id)
  const snapshot = await read()
  expect(
    snapshot.participants.find((participant) => participant.id === `dispatch:${dispatch.id}`)
  ).toMatchObject({ executionHost: 'ssh:review-server', state: 'unknown' })
  expect(snapshot.assignments.find((assignment) => assignment.id === dispatch.id)).toMatchObject({
    task: { status: 'dispatched' }
  })
})

it('refuses agent CLI callers on both global monitor reads', async () => {
  const { ctx } = setup()
  const agent = { ...ctx, caller: { kind: 'local-cli' as const } }
  await expect(h.call('orchestration.monitor', {}, agent)).rejects.toThrow(
    'Open the orchestration monitor in Orca.'
  )
  await expect(
    h.call('orchestration.monitorMessage', { id: 'private-message' }, agent)
  ).rejects.toThrow('Open the orchestration monitor in Orca.')
})
