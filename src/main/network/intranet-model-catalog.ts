import type { AgentModelCatalogDiscovery } from '../native-chat/agent-model-catalog/agent-model-catalog-discovery'
import { parse as parseJsonc } from 'jsonc-parser'
import { z } from 'zod'
import type { AgentModelCatalogSuccess } from '../native-chat/agent-model-catalog/agent-model-catalog-entry'
import type { StructuredAgentModelCatalogContext } from '../runtime/agent-session/installation/structured-agent-runtime-registration-types'
import { supportsIntranetCliDefaults } from '../../shared/intranet/intranet-features'
import { agentSessionAccountHomePath } from '../../shared/agent-session/lifecycle/accounts/agent-session-account-home'
import { withClaudeSettingsEnvironment } from '../claude/configuration/claude-settings-environment'

type IntranetCatalogContext = {
  deps: Pick<StructuredAgentModelCatalogContext['deps'], 'resolveAgentLaunchEnv'>
}

function configuredCatalog(
  agent: string,
  env: Record<string, string>
): AgentModelCatalogSuccess | null {
  let model = agent === 'claude' ? env.ANTHROPIC_MODEL : undefined
  let registered: { id: string; label: string }[] | undefined
  if (env.ORCA_INTRANET_AGENT_MODELS) {
    const parsed = z
      .array(z.object({ id: z.string(), label: z.string() }))
      .safeParse(parseJsonc(env.ORCA_INTRANET_AGENT_MODELS))
    if (parsed.success && parsed.data.length) {
      registered = parsed.data
      model = env.ORCA_INTRANET_AGENT_DEFAULT_MODEL
    }
  }
  if (agent === 'opencode' || agent === 'opencode2') {
    const parsed = z
      .array(z.object({ id: z.string(), label: z.string() }))
      .safeParse(parseJsonc(env.ORCA_INTRANET_OPENCODE_MODELS ?? 'null'))
    if (!parsed.success || !parsed.data.length) {
      return null
    }
    registered = parsed.data
  }
  if (registered && env.OPENCODE_CONFIG_CONTENT) {
    const config: unknown = parseJsonc(env.OPENCODE_CONFIG_CONTENT)
    if (
      config &&
      typeof config === 'object' &&
      'model' in config &&
      typeof config.model === 'string'
    ) {
      model = config.model
    }
  }
  if (!model) {
    return null
  }
  return {
    origin: 'probe',
    configured: { model },
    complete: true,
    models: (registered ?? [{ id: model, label: model }]).map((entry) => ({
      ...entry,
      isDefault: entry.id === model,
      efforts: []
    }))
  }
}

export function intranetModelDiscovery(
  agent: string,
  context: IntranetCatalogContext,
  fallback: AgentModelCatalogDiscovery
): AgentModelCatalogDiscovery {
  return {
    ...fallback,
    kind: 'probe',
    listingNamesConfiguredModel: fallback.kind === 'probe' && fallback.listingNamesConfiguredModel,
    probe: async (home, options) => {
      const inherited = context.deps.resolveAgentLaunchEnv?.(agent) ?? {}
      const directory = agent === 'claude' ? agentSessionAccountHomePath(home) : null
      const env = directory ? await withClaudeSettingsEnvironment(inherited, directory) : inherited
      const configured = configuredCatalog(agent, env)
      if (configured) {
        return configured
      }
      if (supportsIntranetCliDefaults(agent) && fallback.kind === 'probe') {
        return fallback.probe(home, options)
      }
      return { origin: 'probe', complete: true, models: [] }
    }
  }
}
