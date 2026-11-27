import type { IntranetSettings } from './intranet-settings'
import { effectiveMcpAuth } from './intranet-mcp-auth'

type McpDefinition = Record<string, unknown>

export function intranetMcpServers(
  settings: IntranetSettings,
  format: 'claude' | 'opencode'
): Record<string, McpDefinition> {
  const resources = settings.resources
  const definitions: Record<string, McpDefinition> = Object.create(null)
  const bridgeCommand = resources?.bridgeCommand || 'orca'
  definitions['orca-bada'] =
    format === 'claude'
      ? { type: 'stdio', command: bridgeCommand, args: ['bada-auth-mcp'] }
      : { type: 'local', command: [bridgeCommand, 'bada-auth-mcp'] }
  if (!resources) {
    return definitions
  }
  for (const server of resources.mcpServers.filter((entry) => entry.enabled)) {
    if (
      server.transport !== 'stdio' &&
      (server.transport === 'sse' || (server.auth && effectiveMcpAuth(server).type !== 'none'))
    ) {
      definitions[server.id] =
        format === 'claude'
          ? { type: 'stdio', command: bridgeCommand, args: ['intranet-mcp', server.id] }
          : { type: 'local', command: [bridgeCommand, 'intranet-mcp', server.id] }
      continue
    }
    const env = server.auth ? '' : server.tokenEnv
    const token = format === 'claude' ? `\${${env}}` : `{env:${env}}`
    definitions[server.id] =
      server.transport === 'http'
        ? {
            type: format === 'claude' ? 'http' : 'remote',
            url: server.url,
            ...(format === 'opencode' ? { oauth: false } : {}),
            ...(env ? { headers: { Authorization: `Bearer ${token}` } } : {})
          }
        : format === 'claude'
          ? { type: 'stdio', command: server.command, args: server.args }
          : { type: 'local', command: [server.command, ...server.args] }
  }
  const sources = resources.sources.filter((source) => source.enabled)
  if (sources.length) {
    const env = { ORCA_INTRANET_RESOURCES: JSON.stringify(sources) }
    definitions['orca-resources'] =
      format === 'claude'
        ? { type: 'stdio', command: resources.bridgeCommand, args: ['intranet-resources-mcp'], env }
        : {
            type: 'local',
            command: [resources.bridgeCommand, 'intranet-resources-mcp'],
            environment: env
          }
  }
  return definitions
}

export function intranetMcpConfig(
  settings: IntranetSettings,
  format: 'claude' | 'opencode'
): Record<string, unknown> {
  const servers = intranetMcpServers(settings, format)
  if (format === 'claude') {
    return { mcpServers: servers }
  }
  return { mcp: settings.opencode.configVersion === 'v2' ? { servers } : servers }
}

export function mergeIntranetOpenCodeMcp(
  ownConfig: Record<string, unknown>,
  settings: IntranetSettings
): Record<string, unknown> {
  const servers = intranetMcpServers(settings, 'opencode')
  if (!Object.keys(servers).length) {
    return ownConfig
  }
  const ownMcp = ownConfig.mcp
  if (ownMcp !== undefined && (!ownMcp || typeof ownMcp !== 'object' || Array.isArray(ownMcp))) {
    throw new Error('OpenCode MCP 설정은 객체여야 합니다.')
  }
  const mcp = (ownMcp ?? {}) as Record<string, unknown>
  return {
    ...ownConfig,
    mcp:
      settings.opencode.configVersion === 'v2'
        ? { ...mcp, servers: { ...(mcp.servers as Record<string, unknown>), ...servers } }
        : { ...mcp, ...servers }
  }
}
