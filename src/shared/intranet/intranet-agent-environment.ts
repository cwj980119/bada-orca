import {
  intranetOpenCodeModels,
  intranetOpenCodeDefaultModel,
  intranetOpenCodeModelLabel,
  intranetOpenCodeModelReference
} from './intranet-opencode-models'
import { readIntranetSettings } from './intranet-settings'
import { intranetMcpServers, mergeIntranetOpenCodeMcp } from './intranet-mcp-config'

export function intranetAgentEnvironment(
  agent: string,
  value: unknown,
  environment: Record<string, string>
): Record<string, string> {
  const settings = readIntranetSettings(value)
  const result: Record<string, string> = { ...environment, DO_NOT_TRACK: '1' }
  const cliModels = settings.cliModels?.[agent]
  if (cliModels?.models.length) {
    result.ORCA_INTRANET_AGENT_MODELS = JSON.stringify(
      cliModels.models.map((model) => ({ id: model.id, label: intranetOpenCodeModelLabel(model) }))
    )
    result.ORCA_INTRANET_AGENT_DEFAULT_MODEL = cliModels.model || cliModels.models[0]!.id
  }
  if (agent === 'claude' || agent === 'claude-agent-teams') {
    Object.assign(result, {
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      DISABLE_AUTOUPDATER: '1',
      DISABLE_TELEMETRY: '1',
      DISABLE_ERROR_REPORTING: '1',
      DISABLE_BUG_COMMAND: '1',
      CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1'
    })
    if (settings.claude.baseUrl) {
      result.ANTHROPIC_BASE_URL = settings.claude.baseUrl
    }
    if (settings.claude.model) {
      Object.assign(result, {
        ANTHROPIC_MODEL: settings.claude.model,
        ANTHROPIC_SMALL_FAST_MODEL: settings.claude.model,
        ANTHROPIC_DEFAULT_SONNET_MODEL: settings.claude.model,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: settings.claude.model,
        ANTHROPIC_DEFAULT_OPUS_MODEL: settings.claude.model
      })
    }
  }
  if (agent === 'opencode' || agent === 'opencode2') {
    Object.assign(result, {
      OPENCODE_DISABLE_AUTOUPDATE: 'true',
      OPENCODE_DISABLE_MODELS_FETCH: 'true',
      OPENCODE_DISABLE_SHARE: 'true'
    })
    const { baseUrl, configVersion, apiKeyEnv } = settings.opencode
    const defaultModel = intranetOpenCodeDefaultModel(settings.opencode)
    const models = intranetOpenCodeModels(settings.opencode)
    delete result.ORCA_INTRANET_OPENCODE_MODELS
    const custom = baseUrl && models.length > 0
    if (!defaultModel && !Object.keys(intranetMcpServers(settings, 'opencode')).length) {
      return result
    }
    if (models.length) {
      result.ORCA_INTRANET_OPENCODE_MODELS = JSON.stringify(
        models.map((entry) => ({
          id: intranetOpenCodeModelReference(settings.opencode, entry.id),
          label: intranetOpenCodeModelLabel(entry)
        }))
      )
    }
    let ownConfig: Record<string, unknown> = {}
    if (result.OPENCODE_CONFIG_CONTENT) {
      const parsed: unknown = JSON.parse(result.OPENCODE_CONFIG_CONTENT)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('OpenCode inline configuration must be an object.')
      }
      ownConfig = parsed as Record<string, unknown>
    }
    const providerKey = configVersion === 'v2' ? 'providers' : 'provider'
    const provider =
      configVersion === 'v2'
        ? {
            name: 'Internal model',
            package: '@opencode/ai/providers/openai-compatible',
            settings: { baseURL: baseUrl },
            ...(apiKeyEnv ? { env: [apiKeyEnv] } : {}),
            models: Object.fromEntries(
              models.map((entry) => [entry.id, { name: intranetOpenCodeModelLabel(entry) }])
            )
          }
        : {
            name: 'Internal model',
            npm: '@ai-sdk/openai-compatible',
            options: { baseURL: baseUrl, ...(apiKeyEnv ? { apiKey: `{env:${apiKeyEnv}}` } : {}) },
            models: Object.fromEntries(
              models.map((entry) => [entry.id, { name: intranetOpenCodeModelLabel(entry) }])
            )
          }
    result.OPENCODE_CONFIG_CONTENT = JSON.stringify({
      ...mergeIntranetOpenCodeMcp(ownConfig, settings),
      ...(defaultModel ? { model: defaultModel } : {}),
      ...(configVersion === 'v2'
        ? { update: 'disable' }
        : { autoupdate: false, share: 'disabled' }),
      ...(custom
        ? {
            [providerKey]: {
              ...(ownConfig[providerKey] as Record<string, unknown>),
              internal: provider
            },
            model: defaultModel,
            ...(configVersion === 'v1'
              ? { small_model: defaultModel, enabled_providers: ['internal'] }
              : {
                  policies: [
                    { action: 'provider.use', resource: '*', effect: 'deny' },
                    { action: 'provider.use', resource: 'internal', effect: 'allow' }
                  ]
                })
          }
        : {})
    })
  }
  return result
}
