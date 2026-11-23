import type { Options } from '@anthropic-ai/claude-agent-sdk'
import type { AgentSessionRewindFork } from '../../../../shared/agent-session/lifecycle/rewind/agent-session-rewind'

export function claudeRewindForkOptions(
  fork: AgentSessionRewindFork
): Pick<Options, 'resume' | 'resumeSessionAt' | 'forkSession'> {
  return fork.throughEntryId
    ? { resume: fork.sourceSessionId, resumeSessionAt: fork.throughEntryId, forkSession: true }
    : {}
}
