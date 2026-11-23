import type { AgentMenuRowsTarget, NewTabAgentMenuModel } from './new-tab-agent-menu-model'
import type { AgentDetectionTarget } from '@/lib/agent-session/launch/inventory/useDetectedAgents'
import {
  useAgentMenuObservation,
  type AgentMenuObservationOptions
} from './use-agent-menu-observation'
export {
  useAgentMenuObservation,
  type AgentMenuObservationOptions
} from './use-agent-menu-observation'

/** `detectionTarget` is the workspace's agent-inventory host, resolved by the caller. */
export function useNewTabAgentMenuRows(
  target: string | AgentMenuRowsTarget,
  open: boolean,
  detectionTarget: AgentDetectionTarget | undefined,
  options?: AgentMenuObservationOptions
): NewTabAgentMenuModel {
  // Only the new-tab menu opens setup chats; pickers that save an agent need one that runs.
  return useAgentMenuObservation(target, open, detectionTarget, {
    ...options,
    offerAgentSetup: true
  }).model
}
