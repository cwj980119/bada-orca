import { expect, it } from 'vitest'
import { structuredAgentConfiguredArgs } from './structured-agent-configured-args'
import { defaultIntranetSettings } from '../../../shared/intranet/intranet-settings'
import { composeAgentLaunchProfile } from '../../../shared/agent-launch/choices/tui-agent-launch-defaults'
import type { IntranetResources } from '../../../shared/intranet/intranet-resources'

it('adapts shared MCP connections into Codex overrides while keeping existing CLI arguments', () => {
  const args = structuredAgentConfiguredArgs(
    'codex',
    {
      intranet: {
        ...defaultIntranetSettings(),
        resources: {
          bridgeCommand: 'orca',
          sources: [],
          mcpServers: [
            {
              id: 'company',
              name: 'Company',
              enabled: true,
              purpose: 'tools',
              transport: 'http',
              url: 'https://tools.company.internal/mcp',
              tokenEnv: 'COMPANY_TOKEN',
              command: '',
              args: []
            }
          ]
        }
      },
      agentDefaultArgs: { codex: '--model company-coder' }
    },
    'linux'
  )
  expect(args).toContain('mcp_servers.company.url="https://tools.company.internal/mcp"')
  expect(args).toContain('mcp_servers.company.bearer_token_env_var="COMPANY_TOKEN"')
  expect(args.slice(-2)).toEqual(['--model', 'company-coder'])
})

it('applies current resource connections at structured launch while leaving stored and published arguments editable', () => {
  const resources: IntranetResources = {
    bridgeCommand: 'orca',
    sources: [],
    mcpServers: [
      {
        id: 'company',
        name: 'Knowledge',
        purpose: 'knowledge',
        enabled: true,
        transport: 'http',
        url: 'https://knowledge.company.internal/mcp',
        command: '',
        args: [],
        tokenEnv: ''
      }
    ]
  }
  const settings = {
    intranet: { ...defaultIntranetSettings(), resources },
    agentDefaultArgs: { claude: '--model company-coder' }
  }
  const args = structuredAgentConfiguredArgs('claude', settings, 'win32')
  expect(args[0]).toBe('--mcp-config')
  expect(JSON.parse(args[1]!).mcpServers.company.url).toBe('https://knowledge.company.internal/mcp')
  expect(settings.agentDefaultArgs.claude).toBe('--model company-coder')
  expect(composeAgentLaunchProfile(settings, 'win32').agentDefaultArgs.claude).not.toContain(
    '--mcp-config'
  )
  const changed = structuredAgentConfiguredArgs(
    'claude',
    {
      ...settings,
      intranet: {
        ...settings.intranet,
        resources: {
          ...resources,
          mcpServers: resources.mcpServers.map((server) => ({
            ...server,
            url: 'https://new-knowledge.company.internal/mcp'
          }))
        }
      }
    },
    'win32'
  )
  expect(JSON.parse(changed[1]!).mcpServers.company.url).toBe(
    'https://new-knowledge.company.internal/mcp'
  )
})
