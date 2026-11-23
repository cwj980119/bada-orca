import { expect, it } from 'vitest'
import { mergeMonitorHosts, type MonitorHostSnapshot } from './monitor-host-snapshot'

it('keeps identical mailbox and message ids on different hosts in separate relationships', () => {
  const local: MonitorHostSnapshot = {
    id: 'local',
    label: 'Local',
    target: { kind: 'local' },
    state: 'ready',
    error: null,
    snapshot: {
      capturedAt: '2026-11-22T00:00:00Z',
      participants: [
        {
          id: 'term_a',
          address: 'term_a',
          name: 'Reviewer',
          kind: 'terminal',
          agent: 'codex',
          model: null,
          executionHost: null,
          state: 'connected',
          cwd: null
        }
      ],
      messages: [
        {
          id: 'msg_1',
          from: 'term_a',
          to: 'term_a',
          fromAddress: 'term_a',
          toAddress: 'term_a',
          subject: 'Status',
          preview: '',
          type: 'status',
          priority: 'normal',
          createdAt: '2026-11-22T00:00:00Z',
          deliveredAt: null,
          delivery: 'pending',
          question: null,
          outcome: null,
          threadId: null,
          runId: 'run_1',
          task: null
        }
      ],
      assignments: [],
      limits: { messages: false, assignments: false, participants: false },
      omittedTerminalHosts: []
    }
  }
  const remote: MonitorHostSnapshot = {
    ...local,
    id: 'runtime:review',
    label: 'Review server',
    target: { kind: 'environment', environmentId: 'review' },
    state: 'offline'
  }
  const result = mergeMonitorHosts([local, remote])
  expect(result.messages[0].id).not.toBe(result.messages[1].id)
  expect(result.messages[0].from).toBe(result.participants[0].id)
  expect(result.messages[1].from).toBe(result.participants[1].id)
  expect(result.participants[0].state).toBe('connected')
  expect(result.participants[1].state).toBe('unknown')
})
