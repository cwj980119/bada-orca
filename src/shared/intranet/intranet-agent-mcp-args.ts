import { intranetMcpServers } from './intranet-mcp-config'
import { intranetCodexMcpOverrides } from './intranet-codex-mcp'
import { readIntranetSettings } from './intranet-settings'
import {
  quoteStartupArg,
  tokenizeStartupCommand,
  type AgentStartupShell
} from '../agent-launch/startup/tui-agent-startup-shell'

export function intranetAgentMcpArgs(
  agent: string,
  settings: unknown,
  args: string,
  shell: AgentStartupShell
): string {
  if (agent !== 'claude' && agent !== 'claude-agent-teams' && agent !== 'codex') {
    return args
  }
  const parsed = tokenizeStartupCommand(args, shell)
  if (agent === 'codex') {
    const configured = Object.entries(intranetCodexMcpOverrides(readIntranetSettings(settings)))
      .flatMap(([key, value]) => ['-c', quoteStartupArg(`${key}=${JSON.stringify(value)}`, shell)])
      .join(' ')
    return `${configured}${args ? ` ${args}` : ''}`
  }
  if (
    !parsed.ok ||
    parsed.tokens.some((token) => token === '--mcp-config' || token.startsWith('--mcp-config='))
  ) {
    return args
  }
  const servers = intranetMcpServers(readIntranetSettings(settings), 'claude')
  if (!Object.keys(servers).length) {
    return args
  }
  const config = quoteStartupArg(JSON.stringify({ mcpServers: servers }), shell)
  return `--mcp-config ${config}${args ? ` ${args}` : ''}`
}
