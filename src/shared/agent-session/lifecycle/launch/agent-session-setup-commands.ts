import { TUI_AGENT_DISPLAY_NAMES } from '../../../agent-launch/catalog/tui-agent-display-names'
import type { AgentSessionAccountKind } from '../../failures/agent-session-availability'
import type { AgentStartupShell } from '../../../agent-launch/startup/tui-agent-startup-shell'

/** How a chat host installs and signs in each agent. `installCommand` is a POSIX shell line; `windowsInstallScript` is the official PowerShell installer. */
export const AGENT_SESSION_SETUP_COMMANDS: readonly {
  agent: keyof typeof TUI_AGENT_DISPLAY_NAMES
  loginCommand: readonly string[]
  remoteLoginCommand?: readonly string[]
  slashCommand?: string
  installCommand?: string
  windowsInstallScript?: string
}[] = []

export function agentSessionSetupFor(agent: string | undefined) {
  return AGENT_SESSION_SETUP_COMMANDS.find(
    (entry) => entry.agent === agent || TUI_AGENT_DISPLAY_NAMES[entry.agent] === agent
  )
}

/** The terminal command that signs `agent` in on its chat host; `remote` when the user watches from another device. */
export function agentSessionSignInCommand(
  _agent: string | undefined,
  _options: { account?: AgentSessionAccountKind; remote: boolean; shell?: AgentStartupShell | null }
): string | null {
  return null
}

/** The shell line that installs `agent` on a host of `hostPlatform`; null when unknown or without one. */
export function agentSessionInstallCommand(
  _agent: string | undefined,
  _hostPlatform: string | null | undefined
): string | null {
  return null
}
