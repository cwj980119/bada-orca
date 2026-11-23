import type { StateCreator } from 'zustand'
import type { AppState } from '../../types'
import type {
  AgentCliUpdate,
  AgentCliUpdateAgent,
  AgentCliUpdateRunResult
} from '../../../../../shared/agent-launch/installation/agent-cli-update'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'

import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
// Above the host's own ten-minute limit, so its answer always arrives.
const RUN_TIMEOUT_MS = 11 * 60000
export type AgentCliUpdateRun =
  | {
      phase: 'running'
    }
  | {
      phase: 'failed'
      output: string
    }
/** One host's answer about the user's own agent CLIs, and the updates run there from this window. */
export type AgentCliUpdateHost = {
  updates: readonly AgentCliUpdate[]
  runs: Partial<Record<AgentCliUpdateAgent, AgentCliUpdateRun>>
}
/** '' is this computer; otherwise the paired server's environment id. */
export function agentCliUpdateHostKey(target: RuntimeClientTarget): string {
  return target.kind === 'local' ? '' : target.environmentId
}
export function agentCliUpdateHostTarget(key: string): RuntimeClientTarget {
  return key === '' ? { kind: 'local' } : { kind: 'environment', environmentId: key }
}
const EMPTY_HOST: AgentCliUpdateHost = { updates: [], runs: {} }
export type AgentCliUpdatesSlice = {
  agentCliUpdates: ReadonlyMap<string, AgentCliUpdateHost>
  /** Asks the host which of the user's own CLIs are behind; the host caches its answer. */
  checkAgentCliUpdates: (target: RuntimeClientTarget) => Promise<void>
  /** Resolves true once the host reports the CLI current. */
  runAgentCliUpdate: (target: RuntimeClientTarget, agent: AgentCliUpdateAgent) => Promise<boolean>
}
export const createAgentCliUpdatesSlice: StateCreator<AppState, [], [], AgentCliUpdatesSlice> = (
  set,
  get
) => {
  const writeHost = (key: string, write: (host: AgentCliUpdateHost) => AgentCliUpdateHost) =>
    set((state) => {
      const next = new Map(state.agentCliUpdates)
      next.set(key, write(state.agentCliUpdates.get(key) ?? EMPTY_HOST))
      return { agentCliUpdates: next }
    })
  const writeRun = (key: string, agent: AgentCliUpdateAgent, run: AgentCliUpdateRun) =>
    writeHost(key, (host) => ({ ...host, runs: { ...host.runs, [agent]: run } }))
  return {
    agentCliUpdates: new Map(),
    checkAgentCliUpdates: (_target) => {
      {
        return Promise.resolve()
      }
    },
    runAgentCliUpdate: async (target, agent) => {
      const key = agentCliUpdateHostKey(target)
      if (get().agentCliUpdates.get(key)?.runs[agent]?.phase === 'running') {
        return false
      }
      writeRun(key, agent, { phase: 'running' })
      let result: AgentCliUpdateRunResult
      try {
        result = await callRuntimeRpc<AgentCliUpdateRunResult>(
          target,
          'agentCliUpdate.run',
          { agent },
          { timeoutMs: RUN_TIMEOUT_MS }
        )
      } catch (error) {
        result = { ok: false, output: error instanceof Error ? error.message : String(error) }
      }
      if (!result.ok) {
        writeRun(key, agent, { phase: 'failed', output: result.output })
        return false
      }
      writeHost(key, (host) => {
        const runs = { ...host.runs }
        delete runs[agent]
        return { updates: host.updates.filter((update) => update.agent !== agent), runs }
      })
      return true
    }
  }
}
