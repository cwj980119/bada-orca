import { parse as parseToml } from 'smol-toml'
import { asRecord, parseJsoncObject } from '../workspace-setup/setup-script-import-parsers'
import { IntranetMcpServerSchema, type IntranetMcpServer } from './intranet-resources'
import { importMcpAuthentication } from './intranet-mcp-import-auth'

export function importIntranetMcpServers(text: string): IntranetMcpServer[] {
  if (text.length > 256 * 1024) {
    throw new Error('MCP 설정은 256 KB 이하로 입력해 주세요.')
  }
  let root = parseJsoncObject(text)
  if (!root) {
    try {
      root = asRecord(parseToml(text))
    } catch {
      /* Report one input error for either format. */
    }
  }
  if (!root) {
    throw new Error('JSON, JSONC 또는 Codex TOML 설정을 입력해 주세요.')
  }
  const mcp = asRecord(root.mcp)
  const definitions =
    asRecord(root.mcpServers ?? root.mcp_servers ?? mcp?.servers ?? mcp ?? root.servers) ??
    (typeof root.url === 'string' || root.command ? { 'imported-server': root } : null)
  if (!definitions || !Object.keys(definitions).length) {
    throw new Error('가져올 MCP 서버가 없습니다.')
  }
  const servers = Object.entries(definitions).map(([name, value]) => {
    const server = asRecord(value)
    if (!server) {
      throw new Error('각 MCP 서버 설정은 객체여야 합니다.')
    }
    if (
      server.type !== undefined &&
      !['stdio', 'local', 'http', 'remote', 'sse'].includes(String(server.type))
    ) {
      throw new Error('Streamable HTTP, SSE 또는 stdio 연결 방식을 입력해 주세요.')
    }
    const authentication = importMcpAuthentication(server)
    for (const field of ['env', 'environment', 'env_vars']) {
      if (server[field] && Object.keys(server[field] as object).length) {
        throw new Error(
          'stdio 서버의 환경변수는 CLI 실행 환경에 등록한 뒤, MCP 설정에서는 env/environment/env_vars를 제외해 주세요.'
        )
      }
    }
    const command = Array.isArray(server.command) ? server.command[0] : server.command
    const args = Array.isArray(server.command) ? server.command.slice(1) : (server.args ?? [])
    const candidate = IntranetMcpServerSchema.safeParse({
      id: name,
      name,
      purpose: 'tools',
      enabled: server.enabled !== false && server.disabled !== true,
      transport: server.type === 'sse' ? 'sse' : typeof server.url === 'string' ? 'http' : 'stdio',
      url: server.url ?? '',
      command: command ?? '',
      args,
      ...authentication
    })
    if (!candidate.success) {
      throw new Error(
        '서버 ID, URL, 명령과 인자 형식을 확인해 주세요. ID에는 영문·숫자·밑줄·하이픈을 사용할 수 있습니다.'
      )
    }
    return candidate.data
  })
  if (servers.length > 64) {
    throw new Error('MCP 서버는 최대 64개까지 등록할 수 있습니다.')
  }
  return servers
}
