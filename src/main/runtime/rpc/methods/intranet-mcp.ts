import {
  IntranetMcpAuthParams,
  IntranetMcpConnectionParams,
  IntranetMcpSecretParams
} from '../../../../shared/intranet/intranet-mcp-rpc'
import { readIntranetSettings } from '../../../../shared/intranet/intranet-settings'
import { emptyIntranetResources } from '../../../../shared/intranet/intranet-resources'
import { IntranetMcpAuthService } from '../../../intranet-mcp/intranet-mcp-auth-service'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { defineMethod, InvalidArgumentError, type RpcContext } from '../core'

const services = new WeakMap<OrcaRuntimeService, IntranetMcpAuthService>()
function service(context: RpcContext, localCli = false) {
  if (context.caller?.kind !== 'desktop' && !(localCli && context.caller?.kind === 'local-cli')) {
    throw new InvalidArgumentError(
      'MCP authentication is controlled from the desktop app and local CLI.'
    )
  }
  let auth = services.get(context.runtime)
  if (!auth) {
    auth = new IntranetMcpAuthService()
    services.set(context.runtime, auth)
  }
  return auth
}

export const INTRANET_MCP_METHODS = [
  defineMethod({
    name: 'intranet.mcpAuthStatus',
    permission: 'workspace',
    params: IntranetMcpAuthParams,
    handler: ({ server }, context) => service(context).status(server)
  }),
  defineMethod({
    name: 'intranet.mcpSaveSecret',
    permission: 'workspace',
    params: IntranetMcpSecretParams,
    handler: ({ server, secret }, context) => service(context).saveSecret(server, secret)
  }),
  defineMethod({
    name: 'intranet.mcpSignIn',
    permission: 'workspace',
    params: IntranetMcpAuthParams,
    handler: async ({ server }, context) => {
      const auth = service(context)
      const intranet = readIntranetSettings(context.runtime.getClientSettings().intranet)
      const resources = intranet.resources ?? emptyIntranetResources()
      const found = resources.mcpServers.some((entry) => entry.id === server.id)
      await context.runtime.updateClientSettings({
        intranet: {
          ...intranet,
          resources: {
            ...resources,
            mcpServers: found
              ? resources.mcpServers.map((entry) => (entry.id === server.id ? server : entry))
              : [...resources.mcpServers, server]
          }
        }
      })
      return auth.start(server, async (url) => {
        const { shell } = await import('electron')
        await shell.openExternal(url)
      })
    }
  }),
  defineMethod({
    name: 'intranet.mcpSignOut',
    permission: 'workspace',
    params: IntranetMcpAuthParams,
    handler: ({ server }, context) => service(context).clear(server)
  }),
  defineMethod({
    name: 'intranet.mcpCancel',
    permission: 'workspace',
    params: IntranetMcpAuthParams,
    handler: ({ server }, context) => service(context).cancel(server)
  }),
  defineMethod({
    name: 'intranet.mcpConnection',
    permission: 'workspace',
    params: IntranetMcpConnectionParams,
    handler: async ({ id, rejectedToken }, context) => {
      const auth = service(context, true)
      const server = readIntranetSettings(
        context.runtime.getClientSettings().intranet
      ).resources?.mcpServers.find((entry) => entry.id === id && entry.enabled)
      if (!server || server.transport === 'stdio') {
        throw new InvalidArgumentError(
          '활성화된 HTTP MCP 연결을 찾을 수 없습니다. Orca 설정을 저장해 주세요.'
        )
      }
      return {
        transport: server.transport,
        url: server.url,
        headers: await auth.headers(server, rejectedToken)
      }
    }
  })
]
