import { expect, it } from 'vitest'
import { importIntranetMcpServers } from './intranet-mcp-import'

it('imports Claude HTTP authentication as an environment reference', () => {
  expect(
    importIntranetMcpServers(
      '{"mcpServers":{"search":{"url":"https://search.internal/mcp","headers":{"Authorization":"Bearer ${SEARCH_TOKEN}"}}}}'
    )
  ).toEqual([
    {
      id: 'search',
      name: 'search',
      purpose: 'tools',
      enabled: true,
      transport: 'http',
      url: 'https://search.internal/mcp',
      command: '',
      args: [],
      tokenEnv: 'SEARCH_TOKEN'
    }
  ])
})

it('imports OpenCode 2 JSONC command arrays and disabled connections', () => {
  expect(
    importIntranetMcpServers(
      '{ // existing config\n "mcp":{"servers":{"tools":{"type":"local","command":["company-mcp","--local"],"enabled":false,},}},}'
    )
  ).toEqual([
    {
      id: 'tools',
      name: 'tools',
      purpose: 'tools',
      enabled: false,
      transport: 'stdio',
      url: '',
      command: 'company-mcp',
      args: ['--local'],
      tokenEnv: ''
    }
  ])
})

it('imports Codex TOML bearer authentication without reading the environment', () => {
  expect(
    importIntranetMcpServers(
      '[mcp_servers.search]\nurl = "https://search.internal/mcp"\nbearer_token_env_var = "SEARCH_TOKEN"'
    )
  ).toEqual([
    {
      id: 'search',
      name: 'search',
      purpose: 'tools',
      enabled: true,
      transport: 'http',
      url: 'https://search.internal/mcp',
      command: '',
      args: [],
      tokenEnv: 'SEARCH_TOKEN'
    }
  ])
})

it('refuses inline credentials instead of persisting them in common settings', () => {
  expect(() =>
    importIntranetMcpServers(
      '{"mcpServers":{"search":{"url":"https://search.internal/mcp","headers":{"Authorization":"Bearer plaintext-secret"}}}}'
    )
  ).toThrow('직접 입력한 토큰은 저장하지 않습니다')
  expect(() =>
    importIntranetMcpServers(
      '{"mcpServers":{"search":{"command":"company-mcp","env":{"API_KEY":"plaintext-secret"}}}}'
    )
  ).toThrow('환경변수는 CLI 실행 환경에 등록')
})

it('imports OAuth registration options and custom API key environment references', () => {
  const servers = importIntranetMcpServers(
    '{"mcp":{"wiki":{"type":"remote","url":"https://wiki.internal/mcp","oauth":{"clientId":"orca-desktop","scope":"read offline_access","clientSecret":"{env:CLIENT_SECRET}"}},"legacy":{"type":"sse","url":"https://tools.internal/sse","headers":{"X-API-Key":"${TOOL_KEY}"}}}}'
  )
  expect(servers[0]?.auth).toEqual({
    type: 'oauth',
    flow: 'authorization_code',
    clientId: 'orca-desktop',
    scopes: 'read offline_access',
    clientSecret: { source: 'env', env: 'CLIENT_SECRET' }
  })
  expect(servers[1]?.transport).toBe('sse')
  expect(servers[1]?.auth).toEqual({
    type: 'api-key',
    header: 'X-API-Key',
    secret: { source: 'env', env: 'TOOL_KEY' }
  })
  expect(() =>
    importIntranetMcpServers(
      '{"url":"https://wiki.internal/mcp","oauth":{"clientId":"desktop","clientSecret":"plaintext-secret"}}'
    )
  ).toThrow()
})
