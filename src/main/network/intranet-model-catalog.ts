import type { AgentModelCatalogDiscovery } from '../native-chat/agent-model-catalog/agent-model-catalog-discovery'
import { parse as parseJsonc } from 'jsonc-parser'
import { z } from 'zod'
import type { AgentModelCatalogSuccess } from '../native-chat/agent-model-catalog/agent-model-catalog-entry'
import type { StructuredAgentModelCatalogContext } from '../runtime/agent-session/installation/structured-agent-runtime-registration-types'

type IntranetCatalogContext = {
  deps: Pick<StructuredAgentModelCatalogContext['deps'], 'resolveAgentLaunchEnv'>
}

function configuredCatalog(
  agent: string,
  context: IntranetCatalogContext
): AgentModelCatalogSuccess | null {
  const env = context.deps.resolveAgentLaunchEnv?.(agent) ?? {}
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
    probe: async () => {
      const configured = configuredCatalog(agent, context)
      if (configured) {
        return configured
      }
      return { origin: 'probe', complete: true, models: [] }
    }
  }
}
