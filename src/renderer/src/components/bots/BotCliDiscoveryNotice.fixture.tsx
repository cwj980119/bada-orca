import { defineFixture } from '../../component-fixtures/component-fixture'
import { BotCliDiscoveryNotice } from './BotCliDiscoveryNotice'
import type { UseDetectedAgentsResult } from '@/lib/agent-session/launch/inventory/useDetectedAgents'
import type { BotAgent } from '../../../../shared/bot-types'

const inventory: UseDetectedAgentsResult = {
  detectedIds: [],
  isLoading: false,
  detectionFailed: false,
  isRefreshing: false,
  needsServerUpdate: false,
  refresh: async () => []
}
const fixture = (changes: Partial<UseDetectedAgentsResult>, choices: BotAgent[] = []) =>
  defineFixture({
    width: 520,
    render: () => (
      <div className="bg-background p-4">
        <BotCliDiscoveryNotice inventory={{ ...inventory, ...changes }} choices={choices} />
      </div>
    )
  })

export const scanning = fixture({ detectedIds: null, isLoading: true })
export const empty = fixture({})
export const codex = fixture({ detectedIds: ['codex'] }, ['codex'])
export const multiple = fixture({ detectedIds: ['opencode', 'claude', 'codex'] }, [
  'opencode',
  'claude',
  'codex'
])
export const failed = fixture({ detectedIds: null, detectionFailed: true })
