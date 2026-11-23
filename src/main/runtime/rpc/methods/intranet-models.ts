import { defineMethod } from '../core'
import { agentSessionAccountHomePath } from '../../../../shared/agent-session/lifecycle/accounts/agent-session-account-home'
import { readLocalCodexModels } from '../../../codex/configuration/local-codex-models'
import {
  getSystemCodexHomePath,
  resolveOrcaManagedCodexHomePath
} from '../../../codex/configuration/homes/codex-home-paths'
import { normalizeRuntimePathForComparison } from '../../../../shared/file-access/cross-platform-path'

export const INTRANET_MODEL_METHODS = [
  defineMethod({
    name: 'intranet.codexModels',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => {
      const home = agentSessionAccountHomePath(
        await runtime.resolveStructuredAgentAccountHome('codex', 'catalog')
      )
      if (!home) {
        throw new Error('codex_home_unavailable')
      }
      const source =
        normalizeRuntimePathForComparison(home) ===
        normalizeRuntimePathForComparison(resolveOrcaManagedCodexHomePath())
          ? getSystemCodexHomePath()
          : home
      return readLocalCodexModels(source)
    }
  })
] as const
