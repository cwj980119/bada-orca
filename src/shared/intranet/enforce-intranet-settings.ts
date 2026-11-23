import type { GlobalSettings } from '../settings/global-settings-types'
import { isIntranetAgent } from './intranet-features'
import { TUI_AGENT_CONFIG } from '../agent-launch/catalog/tui-agent-config'

export function enforceIntranetSettings(settings: GlobalSettings): GlobalSettings {
  settings.artifactSharingEnabled = false
  settings.agentSkillSharingEnabled = false
  settings.experimentalMobile = false
  settings.showMobileButton = false
  settings.showArtifactsButton = false
  settings.mobileEmulatorEnabled = false
  settings.browserClientHostedRemoteEnabled = false
  settings.experimentalEphemeralVms = false
  settings.prAutoRefresh = 'off'
  settings.refreshLocalBaseRefOnWorktreeCreate = false
  settings.agentStateRulesLiveUpdates = false
  settings.claudeOAuthUsageEnabled = false
  settings.geminiCliOAuthEnabled = false
  if (settings.voice) {
    settings.voice.enabled = false
  }
  if (settings.telemetry && settings.telemetry.optedIn !== false) {
    settings.telemetry = { ...settings.telemetry, optedIn: false }
  }
  if (
    !settings.defaultTuiAgent ||
    (settings.defaultTuiAgent !== 'blank' && !isIntranetAgent(settings.defaultTuiAgent))
  ) {
    settings.defaultTuiAgent = 'opencode'
  }
  const disabled = new Set(settings.disabledTuiAgents)
  let changed = false
  for (const agent of Object.keys(TUI_AGENT_CONFIG) as (keyof typeof TUI_AGENT_CONFIG)[]) {
    if (!isIntranetAgent(agent) && !disabled.has(agent)) {
      disabled.add(agent)
      changed = true
    }
  }
  if (changed) {
    settings.disabledTuiAgents = [...disabled]
  }
  return settings
}
