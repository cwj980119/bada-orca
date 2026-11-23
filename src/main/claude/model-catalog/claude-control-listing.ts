import { claudeSettingsLaunch } from '../configuration/claude-settings-environment'
import { withOrcaClaudeChatEntrypoint } from '../../../shared/agent-launch/startup/claude-chat-entrypoint'
import { waitForPromiseWithSignal } from '../../../shared/concurrency/abort-signal-reason'
import type { ClaudeCliLaunch } from '../cli-capabilities/claude-cli-flag-support'
import { buildClaudeModelListArgs } from '../../../shared/agent-session/options/model-catalog/claude-model-list-probe'
import { runClaudeBackgroundAttempts } from '../../../shared/text-generation/launch/claude-background-run-isolation'
import { claudeConfigDirEnvPatch } from '../structured/launch/claude-config-dir-pin'
import {
  resolveClaudeStructuredInvocation,
  type ClaudeStructuredLaunchPartDeps
} from '../structured/launch/claude-structured-launch-resolution'
import type { ClaudeEnvDeps } from '../structured/launch/claude-structured-child-env'
import {
  AgentModelCatalogProbeError,
  runAgentModelCatalogListing
} from '../../native-chat/agent-model-catalog/agent-model-catalog-probe-runner'

export type ClaudeModelCatalogProbeDeps = ClaudeEnvDeps &
  Pick<ClaudeStructuredLaunchPartDeps, 'resolveAuthPolicy'> & {
    /** Existing captured environment only: saved preference reads never recover a missing CLI. */
    resolveSavedEnvironment?: () => Promise<Record<string, string>>
    resolveLaunchArgs?: () => Promise<string[]> | string[]
    /** Test seam; production runs the shared supervised listing. */
    runListing?: typeof runAgentModelCatalogListing
  }

// Use the session's binary, environment and account for one-shot control requests.
export async function runClaudeListing(
  deps: ClaudeModelCatalogProbeDeps,
  request: {
    accountHomePath: string
    stdin: string
    site: string
    cwd?: string
    signal?: AbortSignal
    isCurrent?: () => boolean
    /** Flags that decide what this CLI loads (a chat's discovery options), read for the resolved CLI. */
    discovery?: (launch: ClaudeCliLaunch) => Promise<readonly string[]>
  }
): Promise<string> {
  // Explicitly pinning the default directory changes the CLI's Keychain identity.
  const {
    command,
    prefixArgs,
    env: inherited
  } = await waitForPromiseWithSignal(
    resolveClaudeStructuredInvocation({ ...deps, signal: request.signal }, (base) => ({
      ...base,
      ...claudeConfigDirEnvPatch(request.accountHomePath, { env: base })
    })),
    request.signal
  )
  const { env, settingsFile } = await claudeSettingsLaunch(inherited, request.accountHomePath)
  const discoveryArgs = request.discovery
    ? await waitForPromiseWithSignal(
        request.discovery({ command, prefixArgs, cwd: request.cwd ?? process.cwd(), env }),
        request.signal
      )
    : []
  const run = (args: readonly string[]) => {
    request.signal?.throwIfAborted()
    if (request.isCurrent && !request.isCurrent()) {
      throw new Error('Listing context retired')
    }
    return (deps.runListing ?? runAgentModelCatalogListing)(
      {
        command,
        args: [...prefixArgs, ...(settingsFile ? ['--settings', settingsFile] : []), ...args],
        stdin: request.stdin,
        ...(request.cwd ? { cwd: request.cwd } : {})
      },
      {
        site: request.site,
        inheritedEnv: withOrcaClaudeChatEntrypoint(env, process.platform),
        signal: request.signal
      }
    )
  }
  const result = await runClaudeBackgroundAttempts({
    agentId: 'claude',
    run: (strictMcp) =>
      run([...buildClaudeModelListArgs(strictMcp, discoveryArgs), ...discoveryArgs]).catch(
        (error: unknown) => {
          if (error instanceof AgentModelCatalogProbeError) {
            return error
          }
          throw error
        }
      ),
    failedExit: (outcome) =>
      outcome instanceof AgentModelCatalogProbeError && outcome.reason === 'exit'
        ? outcome.failedExit
        : undefined
  })
  if (result instanceof AgentModelCatalogProbeError) {
    throw result
  }
  return result
}
