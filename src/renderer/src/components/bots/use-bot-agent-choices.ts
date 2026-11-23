import { useMemo } from 'react'
import { botHostTarget } from '@/lib/bot-hosts'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import type { AgentDetectionTarget } from '@/lib/agent-session/launch/inventory/useDetectedAgents'
import { isBotAgent, type BotAgent } from '../../../../shared/bot-types'
import { useAgentMenuObservation } from '../agent/launch-menu/use-new-tab-agent-menu-rows'
import { isIntranetAgent } from '../../../../shared/intranet/intranet-features'
import type { AgentMenuRowsTarget } from '../agent/launch-menu/new-tab-agent-menu-model'
import { botAgentChoices } from '../../../../shared/bots/bot-agent-choices'

// A bot lives in a folder workspace on its host.
const BOT_HOME: AgentMenuRowsTarget = { workspace: { kind: 'folder' } }

/** The host's agent menu, for the bot agent picker, and the agents a bot can be set to there. */
export function useBotAgentMenu(hostId: ExecutionHostId, open: boolean, current?: BotAgent) {
  const detection = useMemo<AgentDetectionTarget>(() => {
    const target = botHostTarget(hostId)
    return target.kind === 'environment'
      ? { kind: 'runtime', environmentId: target.environmentId }
      : target
  }, [hostId])
  const { model, detection: inventory } = useAgentMenuObservation(BOT_HOME, open, detection, {
    offerAgentSetup: false,
    includeDisabledAgents: true
  })
  const choices = botAgentChoices(model, current).filter(
    (agent) =>
      isIntranetAgent(agent) &&
      (agent === current ||
        (inventory.detectedIds?.includes(agent) &&
          model.state === 'settled' &&
          model.rows.some(
            (row) =>
              row.agent === agent && (row.kind === 'chat' || (row.kind === 'cli' && row.chat))
          )))
  )
  if (model.state === 'settled' && model.defaultTuiAgent && isBotAgent(model.defaultTuiAgent)) {
    const preferred = choices.indexOf(model.defaultTuiAgent)
    if (preferred > 0) {
      choices.unshift(...choices.splice(preferred, 1))
    }
  }
  return {
    model,
    choices,
    inventory: { ...inventory, isLoading: inventory.isLoading || model.state === 'loading' }
  }
}

/** The agents a bot can be set to on the host; see `botAgentChoices`. */
export function useBotAgentChoices(
  hostId: ExecutionHostId,
  open: boolean,
  current?: BotAgent
): BotAgent[] {
  return useBotAgentMenu(hostId, open, current).choices
}
