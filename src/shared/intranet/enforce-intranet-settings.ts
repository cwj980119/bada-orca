import type { GlobalSettings } from '../settings/global-settings-types'
import { isIntranetAgent } from './intranet-features'
import { TUI_AGENT_CONFIG } from '../agent-launch/catalog/tui-agent-config'
import { readIntranetSettings } from './intranet-settings'

export function enforceIntranetSettings(settings: GlobalSettings): GlobalSettings {
  const intranet = readIntranetSettings(settings.intranet)
  if (intranet.claude.baseUrl || intranet.claude.model) {
    for (const choices of [settings.agentLaunchChoices, settings.nativeChatSessionOptions]) {
      if (choices?.claude?.model === intranet.claude.model) {
        const { model: _model, ...rest } = choices.claude
        choices.claude = rest
      }
    }
    settings.intranet = { ...intranet, claude: { baseUrl: '', model: '' } }
  }
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
    settings.voice.sttModel = ''
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
