import { expect, it } from 'vitest'
import { structuredAgentConfiguredArgs } from './structured-agent-configured-args'
import { defaultIntranetSettings } from '../../../shared/intranet/intranet-settings'
import { composeAgentLaunchProfile } from '../../../shared/agent-launch/choices/tui-agent-launch-defaults'
import type { IntranetResources } from '../../../shared/intranet/intranet-resources'

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
