import type { GlobalSettings } from '../../../shared/settings/global-settings-types'

import type { AgentStateRulesSource } from './active-agent-state-rules'

export type AgentStateRulesChannel = 'next' | 'stable'

export function agentStateRulesChannelForAppVersion(
  _appVersion: string
): AgentStateRulesChannel | null {
  throw new Error('This service is not included in the internal edition.')
}

export function agentStateRulesDownloadUrl(_channel: AgentStateRulesChannel): string {
  throw new Error('This service is not included in the internal edition.')
}

export function agentStateRulesCacheFileName(_channel: AgentStateRulesChannel): string {
  throw new Error('This service is not included in the internal edition.')
}

type LiveUpdateSettings = Pick<GlobalSettings, 'agentStateRulesPath' | 'agentStateRulesLiveUpdates'>

export type AgentStateRulesLiveUpdateDeps = {
  userDataPath: string
  appVersion: string

  isPackaged: boolean
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  readSettings: () => LiveUpdateSettings
  onActivated: (rules: { version: number; source: AgentStateRulesSource }) => void
}

export class AgentStateRulesLiveUpdater {
  constructor(_deps: AgentStateRulesLiveUpdateDeps) {}

  async start(): Promise<void> {}

  stop(): void {}

  async refresh(): Promise<void> {}
}

type SettingsStore = {
  getSettings: () => LiveUpdateSettings
  onSettingsChanged: (listener: (updates: Partial<GlobalSettings>) => void) => unknown
}

export function startAgentStateRulesLiveUpdates(
  _store: SettingsStore,
  _onActivated: AgentStateRulesLiveUpdateDeps['onActivated']
): void {}
