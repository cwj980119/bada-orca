import { describe, expect, it } from 'vitest'
import { intranetAgentEnvironment } from './intranet-agent-environment'
import { defaultIntranetSettings } from './intranet-settings'
import { intranetMcpConfig } from './intranet-mcp-config'
import { terminalSessionOptionInputs } from '../agent-launch/startup/tui-agent-launch-command'
import { tokenizeStartupCommand } from '../agent-launch/startup/tui-agent-startup-shell'
import type { IntranetResources } from './intranet-resources'

const resources: IntranetResources = {
  bridgeCommand: 'orca',
  mcpServers: [
    {
      id: 'company-search',
      name: 'Search',
      purpose: 'knowledge',
      enabled: true,
      transport: 'http',
      url: 'https://search.company.internal/mcp',
      tokenEnv: 'COMPANY_SEARCH_TOKEN',
      command: '',
      args: []
    }
  ],
  sources: [
    {
      id: 'company-guides',
      name: 'Guides',
      kind: 'skills',
      path: '/opt/company/skills',
      enabled: true
    }
  ]
}

describe('company resources passed to agents', () => {
  it('connects resources without overriding a model from the existing CLI and merges the v1/v2 MCP layouts', () => {
    const settings = { ...defaultIntranetSettings(), resources }
    const v1 = intranetAgentEnvironment('opencode', settings, {
      OPENCODE_CONFIG_CONTENT:
        '{"model":"existing/coder","mcp":{"existing":{"type":"local","command":["existing-server"]}}}'
    })
    const config = JSON.parse(v1.OPENCODE_CONFIG_CONTENT)
    expect(config.model).toBe('existing/coder')
    expect(config.mcp.existing.command).toEqual(['existing-server'])
    expect(config.mcp['company-search'].headers.Authorization).toBe(
      'Bearer {env:COMPANY_SEARCH_TOKEN}'
    )
    expect(config.mcp['orca-resources'].command).toEqual(['orca', 'intranet-resources-mcp'])
    expect(JSON.parse(config.mcp['orca-resources'].environment.ORCA_INTRANET_RESOURCES)).toEqual([
      {
        id: 'company-guides',
        name: 'Guides',
        kind: 'skills',
        path: '/opt/company/skills',
        enabled: true
      }
    ])
    const v2 = intranetAgentEnvironment(
      'opencode2',
      { ...settings, opencode: { ...settings.opencode, configVersion: 'v2' } },
      {
        OPENCODE_CONFIG_CONTENT:
          '{"mcp":{"timeout":{"startup":30000},"servers":{"existing":{"type":"local","command":["existing-server"]}}}}'
      }
    )
    const config2 = JSON.parse(v2.OPENCODE_CONFIG_CONTENT)
    expect(config2.mcp.timeout.startup).toBe(30000)
    expect(config2.mcp.servers.existing.command).toEqual(['existing-server'])
    expect(config2.mcp.servers['company-search'].url).toBe('https://search.company.internal/mcp')
  })

  it('carries registered MCP servers through Claude launch projection without discarding explicit MCP configuration', () => {
    const intranet = { ...defaultIntranetSettings(), resources }
    const profile = terminalSessionOptionInputs({
      agent: 'claude',
      settings: { intranet, agentDefaultArgs: { claude: '--model company-coder' } },
      agentArgs: undefined,
      sessionOptions: undefined,
      shell: 'powershell'
    })
    const parsed = tokenizeStartupCommand(profile.agentArgs ?? '', 'powershell')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      throw new Error(parsed.error)
    }
    expect(parsed.tokens[0]).toBe('--mcp-config')
    const config = JSON.parse(parsed.tokens[1]!)
    expect(config.mcpServers['company-search'].headers.Authorization).toBe(
      'Bearer ${COMPANY_SEARCH_TOKEN}'
    )
    expect(config.mcpServers['orca-resources'].args).toEqual(['intranet-resources-mcp'])
    const explicit = terminalSessionOptionInputs({
      agent: 'claude',
      settings: { intranet, agentDefaultArgs: { claude: '--mcp-config /company/managed.json' } },
      agentArgs: undefined,
      sessionOptions: undefined,
      shell: 'posix'
    })
    expect(explicit.agentArgs).toBe('--mcp-config /company/managed.json')
    const disabled = intranetMcpConfig(
      {
        ...intranet,
        resources: {
          ...resources,
          sources: [],
          mcpServers: resources.mcpServers.map((entry) => ({ ...entry, enabled: false }))
        }
      },
      'claude'
    )
    expect(disabled).toEqual({ mcpServers: {} })
  })
})
