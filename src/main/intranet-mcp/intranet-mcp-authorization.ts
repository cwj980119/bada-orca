import { randomBytes, timingSafeEqual } from 'node:crypto'
import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { serveHeldLoopbackCallback } from '../orca-profiles/cloud-auth/loopback-callback'
import {
  orcaCallbackReceivedPage,
  orcaCallbackOutcome
} from '../orca-profiles/cloud-auth/profile-cloud-callback-page'
import { effectiveMcpAuth } from '../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'
import type { McpSession } from './intranet-mcp-vault'
import { IntranetMcpOAuthProvider } from './intranet-mcp-oauth-provider'
import { intranetMcpOAuthFetch } from './intranet-mcp-fetch'

const PATH = '/oauth/mcp/callback'
export const MCP_CALLBACK_PORT = 48276
const page = orcaCallbackReceivedPage({
  brand: 'ORCA · MCP',
  heading: 'MCP 연결 인증 중',
  line: '인증 결과를 확인하고 있습니다.'
})
const outcome = (ok: boolean) =>
  orcaCallbackOutcome({
    ok,
    brand: 'ORCA · MCP',
    heading: ok ? 'MCP 로그인 완료' : 'MCP 로그인 실패',
    line: 'Orca 앱으로 돌아가 연결 상태를 확인해 주세요.'
  })

export async function authorizeIntranetMcp(
  server: IntranetMcpServer,
  session: McpSession,
  persist: () => void,
  secret: string | undefined,
  signal: AbortSignal,
  openBrowser: (url: string) => Promise<void>
): Promise<void> {
  const config = effectiveMcpAuth(server)
  if (config.type !== 'oauth') {
    throw new Error('OAuth 연결이 아닙니다.')
  }
  const state = randomBytes(32).toString('base64url')
  const provider = new IntranetMcpOAuthProvider(
    server,
    session,
    persist,
    secret,
    (url) => openBrowser(url.href),
    state
  )
  const options = {
    serverUrl: server.url,
    scope: config.scopes || undefined,
    fetchFn: intranetMcpOAuthFetch(signal)
  }
  const returned = await serveHeldLoopbackCallback<string>({
    path: PATH,
    port: config.callbackPort ?? MCP_CALLBACK_PORT,
    signal,
    timeoutMs: 5 * 60_000,
    errors: {
      timeout: '로그인 시간이 만료되었습니다.',
      cancelled: '로그인이 취소되었습니다.',
      unavailable: '콜백 포트를 사용할 수 없습니다. 다른 포트를 설정해 주세요.',
      failed: '로그인 콜백을 처리할 수 없습니다.'
    },
    hold: { received: page, pending: outcome(false), ms: 45_000 },
    read: (url) => {
      const params = url.searchParams
      const given = Buffer.from(params.get('state') ?? '')
      const expected = Buffer.from(state)
      if (
        [...params.keys()].length !== new Set(params.keys()).size ||
        given.length !== expected.length ||
        !timingSafeEqual(given, expected)
      ) {
        return { kind: 'stray', message: 'Invalid authorization response.' }
      }
      const issuer = session.discovery?.authorizationServerMetadata?.issuer
      if ((params.has('iss') && params.get('iss') !== issuer) || params.has('error')) {
        return {
          kind: 'reject',
          message: 'Authorization failed.',
          error: new Error('OAuth 인증이 거부되었거나 발급자가 일치하지 않습니다.')
        }
      }
      const code = params.get('code')
      return code && code.length <= 4096
        ? { kind: 'accept', value: code }
        : { kind: 'stray', message: 'Missing authorization code.' }
    },
    onListening: async (port) => {
      session.redirectUri = `http://127.0.0.1:${port}${PATH}`
      delete session.tokens
      delete session.expiresAt
      if ((await auth(provider, options)) !== 'REDIRECT') {
        throw new Error('브라우저 인증을 시작하지 못했습니다.')
      }
    }
  })
  try {
    if (
      (await auth(provider, { ...options, authorizationCode: returned.value })) !== 'AUTHORIZED'
    ) {
      throw new Error('인증 코드를 교환하지 못했습니다.')
    }
    returned.answer(outcome(true))
  } catch (error) {
    returned.answer(outcome(false))
    throw error
  }
}
