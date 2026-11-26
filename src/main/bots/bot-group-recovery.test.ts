import { expect, it, vi } from 'vitest'
import { fixture, groupNativeMocks } from './bot-group-native-runtime.test-fixture'

const mocks = groupNativeMocks()
async function pending() {
  const setup = fixture()
  const group = await setup.groups.create({ name: 'Review', botIds: ['bot-0', 'bot-1'] })
  setup.groups.store.append(
    {
      id: 'recover',
      groupId: group.id,
      author: { kind: 'owner' },
      text: 'Recover this instruction',
      createdAt: 1,
      turns: [
        {
          operationId: 'recover-op',
          botId: 'bot-0',
          botName: 'Scout',
          avatar: null,
          agent: 'claude',
          sessionId: group.members[0]!.sessionId,
          deliveryAttempts: 2
        }
      ]
    },
    new Map([['recover-op', '[]']])
  )
  return { ...setup, group }
}
it('retains a failed delivery across restart and retries the same operation', async () => {
  const { groups, group, newRuntime } = await pending()
  mocks.send.mockRejectedValueOnce(new Error('Connection interrupted'))
  groups.resumePending()
  await vi.waitFor(() => expect(groups.store.message('recover')?.turns[0]?.retryable).toBe(true))
  expect(groups.store.pending().map((item) => item.turn.operationId)).toEqual(['recover-op'])
  const delivered: string[] = []
  mocks.send.mockImplementation(async (input) => {
    delivered.push(input.turn.operationId)
    return { kind: 'sent' }
  })
  newRuntime().retry(group.id, 'recover-op')
  await vi.waitFor(() => expect(groups.store.pending()).toEqual([]))
  expect(delivered).toEqual(['recover-op'])
  expect(groups.store.message('recover')?.turns[0]?.error).toBeUndefined()
})
it('reconciles a timeout that was already admitted without delivering another turn', async () => {
  const { groups, newRuntime } = await pending()
  mocks.snapshot.mockImplementation(async () => ({
    submissions: [{ clientMessageId: 'recover-op' }],
    items: []
  }))
  const delivered: string[] = []
  mocks.send.mockImplementation(async (input) => {
    delivered.push(input.turn.operationId)
    return { kind: 'sent' }
  })
  newRuntime().resumePending()
  await vi.waitFor(() => expect(groups.store.pending()).toEqual([]))
  expect(delivered).toEqual([])
})
it('keeps paused mail recoverable and refuses retry after the request is stopped', async () => {
  const { groups, group, bots } = await pending()
  bots[0]!.paused = true
  groups.resumePending()
  await vi.waitFor(() => expect(groups.store.message('recover')?.turns[0]?.retryable).toBe(true))
  expect(groups.store.pending().map((item) => item.turn.operationId)).toEqual(['recover-op'])
  bots[0]!.paused = false
  await groups.stop(group.id)
  expect(() => groups.retry(group.id, 'recover-op')).toThrow()
})
it('reports partial stop failures while fencing every targeted member', async () => {
  const { groups, group } = await pending()
  mocks.cancel
    .mockRejectedValueOnce(new Error('Lost connection'))
    .mockResolvedValueOnce({ ok: true })
  const results = await groups.stop(group.id)
  expect(results.map((result) => result.ok)).toEqual([false, true])
  expect(groups.store.get(group.id).members.map((member) => member.stoppedThroughSequence)).toEqual(
    [1, 1]
  )
})

it('lets healthy members progress while preserving failed member order through retry', async () => {
  const { groups, group } = await pending()
  mocks.send.mockRejectedValueOnce(new Error('Connection interrupted'))
  groups.resumePending()
  await vi.waitFor(() => expect(groups.store.message('recover')?.turns[0]?.retryable).toBe(true))
  const delivered: string[] = []
  mocks.send.mockImplementation(async (input) => {
    delivered.push(
      input.turn.operationId === 'recover-op'
        ? 'recovered'
        : input.sessionId === group.members[0]!.sessionId
          ? 'later'
          : 'healthy'
    )
    return { kind: 'sent' }
  })
  await groups.send({
    groupId: group.id,
    revision: group.revision,
    messageId: 'cccd7ac1-a8a2-4161-a120-c901b5457741',
    text: '@Scout Later for Scout'
  })
  await groups.send({
    groupId: group.id,
    revision: group.revision,
    messageId: '6a90a054-b6da-48e0-b3cf-f0c588e1a744',
    text: '@Forge Independent work'
  })
  await vi.waitFor(() => expect(delivered).toEqual(['healthy']))
  groups.retry(group.id, 'recover-op')
  await vi.waitFor(() => expect(groups.store.pending()).toEqual([]))
  expect(delivered).toEqual(['healthy', 'recovered', 'later'])
})

it('automatically recovers a transient interruption with the reserved operation', async () => {
  const { groups } = await pending()
  const message = groups.store.message('recover')!
  groups.store.update({
    ...message,
    turns: message.turns.map((turn) => ({ ...turn, deliveryAttempts: 0 }))
  })
  const delivered: string[] = []
  mocks.send
    .mockRejectedValueOnce(new Error('Temporary disconnect'))
    .mockImplementation(async (input) => {
      delivered.push(input.turn.operationId)
      return { kind: 'sent' }
    })
  groups.resumePending()
  await vi.waitFor(() => expect(groups.store.pending()).toEqual([]), { timeout: 5000 })
  expect(delivered).toEqual(['recover-op'])
})
