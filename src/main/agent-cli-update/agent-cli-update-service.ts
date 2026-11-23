// Finds and runs updates for the user's own agent CLIs on this host.

// Finds and runs updates for the user's own agent CLIs on this host.
import type {
  AgentCliUpdate,
  AgentCliUpdateAgent,
  AgentCliUpdateRunResult
} from '../../shared/agent-launch/installation/agent-cli-update'

import type { AgentCliUpdateSettings } from './agent-cli-own-install'

const runs = new Map<AgentCliUpdateAgent, Promise<AgentCliUpdateRunResult>>()
/** Enabled agents whose own CLI is behind its latest release. */
export async function checkAgentCliUpdates(
  _settings: AgentCliUpdateSettings
): Promise<AgentCliUpdate[]> {
  {
    return []
  }
}
async function runUpdate(
  _agent: AgentCliUpdateAgent,
  _settings: AgentCliUpdateSettings
): Promise<AgentCliUpdateRunResult> {
  {
    return { ok: false, output: 'Online CLI updates are removed from this internal build.' }
  }
}
/** Joins an update of `agent` already running on this host. */
export function runAgentCliUpdate(
  agent: AgentCliUpdateAgent,
  settings: AgentCliUpdateSettings
): Promise<AgentCliUpdateRunResult> {
  let run = runs.get(agent)
  if (!run) {
    run = runUpdate(agent, settings).finally(() => runs.delete(agent))
    runs.set(agent, run)
  }
  return run
}
