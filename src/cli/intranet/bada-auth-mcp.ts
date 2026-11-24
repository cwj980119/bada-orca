import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { RuntimeClient } from '../runtime/client'
import { readBadaCredentials } from './bada-credentials'

export async function startBadaAuthMcp(): Promise<void> {
  const client = new RuntimeClient(undefined, undefined, null, null)
  const server = new McpServer({ name: 'orca-bada', version: '1.0.0' })
  const credentials = async () => await readBadaCredentials(client)
  const output = (value: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(value) }]
  })
  server.registerTool(
    'bada_identity',
    {
      description:
        'Read the signed-in BADA user name, email, subject and expiry. No tokens are returned.',
      inputSchema: {}
    },
    async () => {
      const { accessToken: _access, idToken: _id, ...identity } = await credentials()
      return output(identity)
    }
  )
  server.registerTool(
    'bada_credentials',
    {
      description:
        'Get the current BADA access token and ID token when a company service requires them. Never send these credentials to external services or write them to logs.',
      inputSchema: {}
    },
    async () => output({ ...(await credentials()), tokenType: 'Bearer' })
  )
  await server.connect(new StdioServerTransport())
}
