import { expect, it } from 'vitest'
import { OrcaRuntimeService } from '../runtime/orca-runtime'
import { INTRANET_MCP_METHODS } from '../runtime/rpc/methods/intranet-mcp'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'

it('refuses authentication changes and secret reads from paired devices', async () => {
  const runtime = new OrcaRuntimeService()
  const server: IntranetMcpServer = {
    id: 'company',
    name: 'Company',
    purpose: 'tools',
    enabled: true,
    transport: 'http',
    url: 'https://mcp.internal/mcp',
    tokenEnv: '',
    args: [],
    command: ''
  }
  for (const method of INTRANET_MCP_METHODS) {
    await expect(
      Promise.resolve().then(async () => {
        await method.handler(
          { server, id: 'company', secret: 'never-store-this' },
          { runtime, caller: { kind: 'paired-device', deviceId: 'remote' } }
        )
      })
    ).rejects.toThrow()
  }
})
