import { intranetMcpServers } from './intranet-mcp-config'
import { readIntranetSettings } from './intranet-settings'
import {
  quoteStartupArg,
  tokenizeStartupCommand,
  type AgentStartupShell
} from '../agent-launch/startup/tui-agent-startup-shell'

export function intranetClaudeMcpArgs(
  agent: string,
  settings: unknown,
  args: string,
  shell: AgentStartupShell
): string {
  if (agent !== 'claude' && agent !== 'claude-agent-teams') {
    return args
  }
  const parsed = tokenizeStartupCommand(args, shell)
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
