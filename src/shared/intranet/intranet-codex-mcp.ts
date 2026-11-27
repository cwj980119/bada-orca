import { intranetMcpServers } from './intranet-mcp-config'
import type { IntranetSettings } from './intranet-settings'

export function intranetCodexMcpServers(
  settings: IntranetSettings
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(intranetMcpServers(settings, 'claude')).map(([name, server]) => {
      if (typeof server.url === 'string') {
        const source = settings.resources?.mcpServers.find((entry) => entry.id === name)
        return [
          name,
          {
            url: server.url,
            ...(source?.tokenEnv ? { bearer_token_env_var: source.tokenEnv } : {})
          }
        ]
      }
      return [
        name,
        { command: server.command, args: server.args, ...(server.env ? { env: server.env } : {}) }
      ]
    })
  )
}

export function intranetCodexMcpOverrides(settings: IntranetSettings): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(intranetCodexMcpServers(settings)).flatMap(([name, server]) =>
      Object.entries(server).flatMap(([field, value]): [string, unknown][] =>
        field === 'env' && value && typeof value === 'object'
          ? Object.entries(value).map(([key, text]) => [`mcp_servers.${name}.env.${key}`, text])
          : [[`mcp_servers.${name}.${field}`, value]]
      )
    )
  )
}
