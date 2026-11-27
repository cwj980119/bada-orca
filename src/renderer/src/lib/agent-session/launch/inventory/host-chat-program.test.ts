import { afterEach, expect, it, vi } from 'vitest'
import { readChatProgram } from './host-chat-program'
import { acquireHostStructuredAgentAvailability } from '@/runtime/native-chat/agent-catalogs/host-structured-agent-availability'
import { subscribeRuntimeRpc } from '@/runtime/rpc/subscriptions/runtime-rpc-subscribe'
import { STRUCTURED_AGENT_SESSION_AVAILABILITY_RUNTIME_CAPABILITY } from '../../../../../../shared/agent-session/capabilities/structured-agent-session-surface-capabilities'

vi.mock('@/runtime/rpc/subscriptions/runtime-rpc-subscribe', () => ({
  subscribeRuntimeRpc: vi.fn()
}))
afterEach(() => vi.restoreAllMocks())

it('does not offer a bundled or installable chat program as a locally installed CLI', () => {
  vi.mocked(subscribeRuntimeRpc).mockImplementation(async (_target, _method, _params, handlers) => {
    handlers.onEvent?.({
      type: 'availability',
      agents: [
        { agent: 'codex', state: 'available', chatProgram: 'available' },
        { agent: 'opencode2', state: 'available', chatProgram: 'installable' }
      ]
    })
    return { unsubscribe: () => {} }
  })
  const release = acquireHostStructuredAgentAvailability({
    target: { kind: 'local' },
    executionHostId: 'local',
    runtimeId: null,
    pairingRevision: undefined
  })
  try {
    const store = { runtimeStatusByEnvironmentId: new Map() }
    const host = {
      executionHostId: 'local',
      hostCapabilities: [STRUCTURED_AGENT_SESSION_AVAILABILITY_RUNTIME_CAPABILITY]
    }
    expect(readChatProgram(store, 'codex', host, [])).toBe('missing')
    expect(readChatProgram(store, 'opencode2', host, [])).toBe('missing')
    expect(readChatProgram(store, 'codex', host, ['codex'])).toBe('available')
  } finally {
    release()
  }
})
