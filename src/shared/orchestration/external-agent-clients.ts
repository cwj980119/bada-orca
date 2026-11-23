export type ExternalAgentConnection = {
  address: string
  agent: 'opencode' | 'claude'
  name: string
  cwd: string
  last_seen: number
}

export type ExternalAgentMcpSetup = {
  command: string
  args: string[]
  env: Record<string, string>
}

export function externalAgentMcpConfig(
  setup: ExternalAgentMcpSetup,
  client: 'claude' | 'v1' | 'v2'
): string {
  const args = [...setup.args, '--agent', client === 'claude' ? 'claude' : 'opencode']
  if (client === 'claude') {
    return JSON.stringify(
      { mcpServers: { orca: { type: 'stdio', command: setup.command, args, env: setup.env } } },
      null,
      2
    )
  }
  const orca = { type: 'local', command: [setup.command, ...args], environment: setup.env }
  return JSON.stringify(
    { mcp: client === 'v2' ? { servers: { orca } } : { orca: { ...orca, enabled: true } } },
    null,
    2
  )
}
