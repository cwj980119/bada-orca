import type { AgentCliUpdateAgent } from '../../shared/agent-launch/installation/agent-cli-update'

export function latestAgentCliRelease(_agent: AgentCliUpdateAgent): Promise<string | null> {
  throw new Error('This service is not included in the internal edition.')
}
