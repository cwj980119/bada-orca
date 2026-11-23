import {
  intranetOpenCodeDefaultModel,
  intranetOpenCodeModels,
  intranetOpenCodeModelReference
} from '../../../shared/intranet/intranet-opencode-models'
import type { GlobalSettings } from '../../../shared/settings/global-settings-types'
import {
  IntranetSettingsSchema,
  readIntranetSettings,
  type IntranetSettings
} from '../../../shared/intranet/intranet-settings'

function configuredModels(settings: IntranetSettings): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(settings.cliModels ?? {}).flatMap(([agent, profile]) => {
        const model = profile.model || profile.models[0]?.id
        return model ? [[agent, model]] : []
      })
    ),
    ...(intranetOpenCodeDefaultModel(settings.opencode)
      ? {
          opencode: intranetOpenCodeDefaultModel(settings.opencode),
          opencode2: intranetOpenCodeDefaultModel(settings.opencode)
        }
      : {}),
    ...(settings.claude.model ? { claude: settings.claude.model } : {})
  }
}

export function intranetSettingsUpdate(
  settings: Pick<GlobalSettings, 'intranet' | 'agentLaunchChoices' | 'nativeChatSessionOptions'> &
    Partial<Pick<GlobalSettings, 'disabledTuiAgents'>>,
  value: unknown
): Partial<GlobalSettings> {
  const intranet = IntranetSettingsSchema.parse(value)
  const before = readIntranetSettings(settings.intranet)
  const previous = configuredModels(before)
  const models = configuredModels(intranet)
  const choices: Record<string, { model?: string; options?: Record<string, string> }> = {
    ...settings.agentLaunchChoices
  }
  const sessionOptions = { ...settings.nativeChatSessionOptions }
  for (const agent of new Set([
    'opencode',
    'opencode2',
    'claude',
    ...Object.keys(before.cliModels ?? {}),
    ...Object.keys(intranet.cliModels ?? {})
  ])) {
    const model = models[agent]
    const references = (value: IntranetSettings): string[] =>
      agent === 'claude'
        ? value.claude.model
          ? [value.claude.model]
          : []
        : agent === 'opencode' || agent === 'opencode2'
          ? intranetOpenCodeModels(value.opencode).map((entry) =>
              intranetOpenCodeModelReference(value.opencode, entry.id)
            )
          : (value.cliModels?.[agent]?.models.map((entry) => entry.id) ?? [])
    const oldReferences = references(before)
    const newReferences = references(intranet)
    for (const target of [choices, sessionOptions]) {
      const selected = target[agent]?.model
      const removed =
        selected !== undefined &&
        oldReferences.includes(selected) &&
        !newReferences.includes(selected)
      if (model && (model !== previous[agent] || removed)) {
        target[agent] = { ...target[agent], model }
      } else if (!model && removed) {
        const { model: _model, ...rest } = target[agent] ?? {}
        target[agent] = rest
      }
    }
  }
  return {
    intranet,
    agentLaunchChoices: choices,
    nativeChatSessionOptions: sessionOptions,
    ...(settings.disabledTuiAgents
      ? {
          disabledTuiAgents: settings.disabledTuiAgents.filter(
            (agent) => !models[agent] || Boolean(previous[agent])
          )
        }
      : {})
  }
}
