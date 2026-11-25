import { expect, it } from 'vitest'
import type { MonitorMessage } from '../../../../shared/orchestration/orchestration-monitor'
import { monitorRequestProgress } from './monitor-request-progress'

const message: MonitorMessage = {
  id: 'request',
  from: 'sender',
  to: 'receiver',
  fromAddress: 'sender',
  toAddress: 'receiver',
  subject: 'Review',
  preview: 'Review the change',
  type: 'question',
  priority: 'normal',
  createdAt: '2026-11-25T07:00:00Z',
  deliveredAt: null,
  delivery: 'pending',
  question: null,
  outcome: null,
  threadId: null,
  runId: 'run',
  task: null
}
const facts = {
  execution: { state: 'sleeping' as const, observedAt: '2026-11-25T07:00:00Z' },
  failureHeld: false
}

it('offers recovery and cancellation for an unadmitted request to a resting bot', () => {
  expect(monitorRequestProgress(message, facts, null)).toMatchObject({
    stage: 'queued',
    actions: ['retry', 'cancel']
  })
})
it('withholds replay and cancellation when delivery is unconfirmed', () => {
  expect(monitorRequestProgress(message, facts, 'unknown')).toMatchObject({
    stage: 'uncertain',
    actions: []
  })
  expect(monitorRequestProgress(message, facts, 'unreadable')).toMatchObject({
    stage: 'uncertain',
    actions: []
  })
})
it('does not retry received work when the receiving chat later fails', () => {
  expect(
    monitorRequestProgress(
      { ...message, delivery: 'read' },
      { ...facts, execution: { ...facts.execution, state: 'failed' } },
      null
    )
  ).toMatchObject({ stage: 'awaiting_response', actions: [] })
})
it('keeps an explicitly paused bot paused even if its queue also has a failure', () => {
  expect(
    monitorRequestProgress(
      message,
      { failureHeld: true, execution: { ...facts.execution, state: 'paused' } },
      null
    )
  ).toMatchObject({ stage: 'blocked', reason: 'paused', actions: ['cancel'] })
})
it('offers explicit chat resumption after a failure, without cancelling a reserved handoff', () => {
  expect(monitorRequestProgress(message, { ...facts, failureHeld: true }, 'waiting')).toMatchObject(
    { stage: 'blocked', reason: 'previous_failure', actions: ['resume'] }
  )
})
it('does not attach a later startup failure to an answered request', () => {
  expect(
    monitorRequestProgress(
      { ...message, outcome: 'answered' },
      {
        ...facts,
        execution: { ...facts.execution, state: 'failed', detail: 'A different start failed' }
      },
      null
    )
  ).toEqual({
    stage: 'completed',
    reason: 'completed',
    actions: [],
    attention: false,
    since: '2026-11-25T07:00:00Z'
  })
})
