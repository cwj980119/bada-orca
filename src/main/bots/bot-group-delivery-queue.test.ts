import { expect, it } from 'vitest'
import { BotGroupDeliveryQueue } from './bot-group-delivery-queue'

it('keeps one session ordered while another progresses and duplicate deliveries stay single', async () => {
  const queue = new BotGroupDeliveryQueue()
  const first = Promise.withResolvers<void>()
  const other = Promise.withResolvers<void>()
  const done = Promise.withResolvers<void>()
  const delivered: string[] = []
  queue.enqueue({
    id: 'first',
    sessionId: 'reviewer',
    run: async () => {
      await first.promise
      delivered.push('first')
    }
  })
  queue.enqueue({
    id: 'second',
    sessionId: 'reviewer',
    run: async () => {
      delivered.push('second')
      done.resolve()
    }
  })
  queue.enqueue({
    id: 'first',
    sessionId: 'reviewer',
    run: async () => {
      delivered.push('duplicate')
    }
  })
  queue.enqueue({
    id: 'other',
    sessionId: 'builder',
    run: async () => {
      delivered.push('other')
      other.resolve()
    }
  })
  await other.promise
  expect(delivered).toEqual(['other'])
  first.resolve()
  await done.promise
  expect(delivered).toEqual(['other', 'first', 'second'])
})
