import { expect, it } from 'vitest'
import type { MonitorMessage } from '../../../../shared/orchestration/orchestration-monitor'
import { mergeMonitorHosts, type MonitorHostSnapshot } from './monitor-host-snapshot'
import { monitorConversations } from './monitor-conversations'

function message(
  id: string,
  from: string,
  to: string,
  threadId: string | null = null
): MonitorMessage {
  return {
    id,
    from,
    to,
    fromAddress: from,
    toAddress: to,
    subject: id,
    preview: id,
    type: 'status',
    priority: 'normal',
    createdAt: `2026-11-22T04:${id === 'first' ? '18' : '19'}:00Z`,
    deliveredAt: null,
    delivery: 'pending',
    question: null,
    outcome: null,
    threadId,
    runId: 'run-review',
    task: null
  }
}

function host(id: MonitorHostSnapshot['id'], messages: MonitorMessage[]): MonitorHostSnapshot {
  return {
    id,
    label: id,
    target: { kind: 'local' },
    state: 'ready',
    error: null,
    snapshot: {
      capturedAt: '2026-11-22T04:20:00Z',
      participants: [],
      messages,
      assignments: [],
      limits: { messages: false, assignments: false, participants: false },
      omittedTerminalHosts: []
    }
  }
}

it('puts reciprocal messages in one direct conversation in chronological order', () => {
  const data = mergeMonitorHosts([
    host('local', [message('reply', 'B', 'A', 'first'), message('first', 'A', 'B')])
  ])
  const rooms = monitorConversations(data.messages)
  expect(
    rooms.map((room) => ({ group: room.group, ids: room.messages.map((item) => item.rawId) }))
  ).toEqual([{ group: false, ids: ['first', 'reply'] }])
})

it('keeps a group thread together without mixing unrelated direct mail in the same run', () => {
  const data = mergeMonitorHosts([
    host('local', [
      message('first', 'A', 'B'),
      message('reply', 'B', 'C', 'first'),
      message('direct', 'A', 'B')
    ])
  ])
  const rooms = monitorConversations(data.messages)
  expect(
    rooms.map((room) => ({ group: room.group, ids: room.messages.map((item) => item.rawId) }))
  ).toEqual([
    { group: true, ids: ['first', 'reply'] },
    { group: false, ids: ['direct'] }
  ])
})

it('uses recorded group membership for separate requests and their replies', () => {
  const data = mergeMonitorHosts([
    host('local', [
      { ...message('first', 'A', 'B'), conversationId: 'group-1' },
      { ...message('second', 'B', 'C'), conversationId: 'group-1' },
      message('reply', 'C', 'B', 'second')
    ])
  ])
  const rooms = monitorConversations(data.messages)
  expect(
    rooms.map((room) => ({ group: room.group, ids: room.messages.map((item) => item.rawId) }))
  ).toEqual([{ group: true, ids: ['first', 'second', 'reply'] }])
})

it('separates identical mailbox and thread ids on different hosts', () => {
  const messages = [message('first', 'A', 'B'), message('reply', 'B', 'C', 'first')]
  const rooms = monitorConversations(
    mergeMonitorHosts([host('local', messages), host('runtime:review', messages)]).messages
  )
  expect(rooms.map((room) => room.messages.map((item) => item.host.id))).toEqual([
    ['local', 'local'],
    ['runtime:review', 'runtime:review']
  ])
})
