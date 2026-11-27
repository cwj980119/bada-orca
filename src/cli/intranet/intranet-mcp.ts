import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { FetchLike, Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import type { IntranetMcpConnection } from '../../shared/intranet/intranet-mcp-rpc'
import { RuntimeClient } from '../runtime/client'

export function intranetMcpFetch(
  origin: string,
  connection: (rejectedToken?: string) => Promise<IntranetMcpConnection>,
  fetch: FetchLike = globalThis.fetch
): FetchLike {
  return async (input, init) => {
    const url = new URL(String(input))
    if (url.origin !== origin || url.username || url.password) {
      throw new Error('MCP 서버와 다른 주소로 인증값을 전달할 수 없습니다.')
    }
    const send = async (config: IntranetMcpConnection) => {
      if (new URL(config.url).origin !== origin) {
        throw new Error('MCP 연결 주소가 변경되었습니다. 에이전트를 다시 시작해 주세요.')
      }
      const headers = new Headers(init?.headers)
      for (const [key, value] of Object.entries(config.headers)) {
        headers.set(key, value)
      }
      return fetch(input, { ...init, headers, redirect: 'error', credentials: 'omit' })
    }
    const current = await connection()
    const response = await send(current)
    const token = current.headers.Authorization?.replace(/^Bearer /, '')
    if (
      response.status !== 401 ||
      !token ||
      !current.headers.Authorization?.startsWith('Bearer ')
    ) {
      return response
    }
    await response.body?.cancel()
    return send(await connection(token))
  }
}

export async function startIntranetMcp(args: string[]): Promise<void> {
  const id = args[0]
  if (args.length !== 1 || !/^[a-zA-Z0-9_-]{1,64}$/.test(id ?? '')) {
    throw new Error('MCP 연결 ID가 필요합니다.')
  }
  const client = new RuntimeClient(undefined, undefined, null, null)
  const connection = async (rejectedToken?: string) =>
    (
      await client.call<IntranetMcpConnection>('intranet.mcpConnection', {
        id,
        ...(rejectedToken ? { rejectedToken } : {})
      })
    ).result
  const config = await connection()
  const savedConnection = async (rejectedToken?: string) => {
    const next = await connection(rejectedToken)
    if (next.url !== config.url || next.transport !== config.transport) {
      throw new Error('MCP 연결 설정이 변경되었습니다. 에이전트를 다시 시작해 주세요.')
    }
    return next
  }
  const url = new URL(config.url)
  const fetch = intranetMcpFetch(url.origin, savedConnection)
  const upstream: Transport =
    config.transport === 'sse'
      ? new SSEClientTransport(url, {
          fetch,
          eventSourceInit: { fetch },
          requestInit: { redirect: 'error' }
        })
      : new StreamableHTTPClientTransport(url, { fetch, requestInit: { redirect: 'error' } })
  const downstream = new StdioServerTransport()
  let closing = false
  const close = async () => {
    if (closing) {
      return
    }
    closing = true
    await Promise.allSettled([upstream.close(), downstream.close()])
  }
  downstream.onclose = () => {
    void close()
  }
  upstream.onclose = () => {
    void close()
  }
  upstream.onerror = () => {
    process.stderr.write('MCP 서버 연결 오류. Orca의 연결 설정을 확인해 주세요.\n')
  }
  upstream.onmessage = (message) => {
    if (
      upstream instanceof StreamableHTTPClientTransport &&
      'result' in message &&
      message.result &&
      typeof message.result.protocolVersion === 'string'
    ) {
      upstream.setProtocolVersion(message.result.protocolVersion)
    }
    void downstream.send(message).catch(() => close())
  }
  downstream.onmessage = (message: JSONRPCMessage) => {
    void upstream.send(message).catch(async () => {
      if ('method' in message && 'id' in message) {
        await downstream.send({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32000,
            message: 'MCP 연결에 실패했습니다. Orca 설정에서 인증 상태를 확인해 주세요.'
          }
        })
      }
    })
  }
  process.once('SIGTERM', () => {
    void close()
  })
  process.once('SIGINT', () => {
    void close()
  })
  try {
    await upstream.start()
    await downstream.start()
  } catch {
    await close()
    throw new Error(
      'MCP 연결을 시작하지 못했습니다. Orca 설정에서 연결 주소와 인증을 확인해 주세요.'
    )
  }
}
