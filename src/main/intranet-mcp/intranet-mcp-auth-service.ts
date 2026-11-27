import { auth } from '@modelcontextprotocol/sdk/client/auth.js'
import { randomUUID } from 'node:crypto'
import {
  effectiveMcpAuth,
  mcpAuthSecret,
  type IntranetMcpAuthStatus
} from '../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'
import { IntranetMcpVault, mcpConfigurationKey, type McpSession } from './intranet-mcp-vault'
import { IntranetMcpOAuthProvider } from './intranet-mcp-oauth-provider'
import { assertMcpCredentialEndpoint, intranetMcpOAuthFetch } from './intranet-mcp-fetch'
import { authorizeIntranetMcp } from './intranet-mcp-authorization'

export class IntranetMcpAuthService {
  private readonly pending = new Map<string, AbortController>()
  private readonly refreshes = new Map<string, Promise<void>>()
  private readonly revisions = new Map<string, number>()
  private readonly errors = new Map<string, string>()

  constructor(
    private readonly vault = new IntranetMcpVault(),
    private readonly readEnv = (name: string): string | undefined => process.env[name]
  ) {}

  private secret(server: IntranetMcpServer, session: McpSession): string | undefined {
    const reference = mcpAuthSecret(effectiveMcpAuth(server))
    return reference?.source === 'env' ? this.readEnv(reference.env) : session.secret
  }

  status(server: IntranetMcpServer): IntranetMcpAuthStatus {
    const key = mcpConfigurationKey(server)
    const session = this.vault.read(server)
    const method = effectiveMcpAuth(server)
    const hasSecret = Boolean(this.secret(server, session))
    const ready =
      method.type === 'none' ||
      (method.type === 'oauth'
        ? Boolean(
            session.tokens &&
            (session.expiresAt === undefined ||
              session.expiresAt > Date.now() ||
              session.tokens.refresh_token)
          )
        : hasSecret)
    return {
      state: this.pending.has(key) ? 'authorizing' : ready ? 'ready' : 'signed-out',
      hasSecret,
      ...(this.errors.has(key) ? { error: this.errors.get(key) } : {})
    }
  }

  private invalidate(server: IntranetMcpServer): void {
    const key = mcpConfigurationKey(server)
    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1)
    this.pending.get(key)?.abort()
    this.pending.delete(key)
    this.refreshes.delete(key)
    this.errors.delete(key)
  }

  private writer(server: IntranetMcpServer, session: McpSession): () => void {
    const key = mcpConfigurationKey(server)
    const revision = this.revisions.get(key)
    if (!session.generation) {
      session.generation = randomUUID()
      this.vault.save(server, session)
    }
    const generation = session.generation
    return () => {
      if (
        revision !== this.revisions.get(key) ||
        this.vault.read(server).generation !== generation
      ) {
        throw new Error('인증 설정이 변경되었습니다. 다시 연결해 주세요.')
      }
      this.vault.save(server, session)
    }
  }

  saveSecret(server: IntranetMcpServer, secret: string): IntranetMcpAuthStatus {
    if (mcpAuthSecret(effectiveMcpAuth(server))?.source !== 'stored') {
      throw new Error('직접 입력 방식을 선택해 주세요.')
    }
    if (!secret || /[\r\n\0]/.test(secret)) {
      throw new Error('비밀값에는 줄바꿈을 사용할 수 없습니다.')
    }
    this.invalidate(server)
    const session = this.vault.read(server)
    this.vault.save(server, { fingerprint: session.fingerprint, secret })
    return this.status(server)
  }

  clear(server: IntranetMcpServer): IntranetMcpAuthStatus {
    this.invalidate(server)
    this.vault.clear(server)
    return this.status(server)
  }

  cancel(server: IntranetMcpServer): IntranetMcpAuthStatus {
    this.invalidate(server)
    return this.status(server)
  }

  start(
    server: IntranetMcpServer,
    openBrowser: (url: string) => Promise<void>
  ): IntranetMcpAuthStatus {
    const method = effectiveMcpAuth(server)
    if (method.type !== 'oauth') {
      throw new Error('OAuth 연결이 아닙니다.')
    }
    assertMcpCredentialEndpoint(server.url)
    this.invalidate(server)
    const key = mcpConfigurationKey(server)
    const controller = new AbortController()
    const session = this.vault.read(server)
    const secret = this.secret(server, session)
    if (method.clientSecret && !secret) {
      this.pending.delete(key)
      throw new Error('Client secret을 보안 저장소 또는 호스트 환경변수에 입력해 주세요.')
    }
    const persist = this.writer(server, session)
    this.pending.set(key, controller)
    const work =
      method.flow === 'client_credentials'
        ? auth(new IntranetMcpOAuthProvider(server, session, persist, secret), {
            serverUrl: server.url,
            scope: method.scopes || undefined,
            fetchFn: intranetMcpOAuthFetch(controller.signal)
          })
        : authorizeIntranetMcp(server, session, persist, secret, controller.signal, openBrowser)
    void work
      .catch(() => {
        if (this.pending.get(key) === controller) {
          this.errors.set(
            key,
            '인증하지 못했습니다. 서버의 OAuth 지원, Client ID, 허용 호스트와 콜백 주소를 확인해 주세요.'
          )
        }
      })
      .finally(() => {
        if (this.pending.get(key) === controller) {
          this.pending.delete(key)
        }
      })
    return this.status(server)
  }

  async headers(
    server: IntranetMcpServer,
    rejectedToken?: string
  ): Promise<Record<string, string>> {
    const method = effectiveMcpAuth(server)
    if (method.type === 'none') {
      return {}
    }
    assertMcpCredentialEndpoint(server.url)
    let session = this.vault.read(server)
    const secret = this.secret(server, session)
    if (method.type !== 'oauth') {
      if (!secret) {
        throw new Error('MCP 인증값을 입력하거나 호스트 환경변수를 설정해 주세요.')
      }
      if (/[\r\n\0]/.test(secret)) {
        throw new Error('인증값 형식이 올바르지 않습니다.')
      }
      if (method.type === 'api-key') {
        return { [method.header]: secret }
      }
      return {
        Authorization:
          method.type === 'basic'
            ? `Basic ${Buffer.from(`${method.username}:${secret}`).toString('base64')}`
            : `Bearer ${secret}`
      }
    }
    if (method.clientSecret && !secret) {
      throw new Error('Client secret을 입력하거나 호스트 환경변수를 설정해 주세요.')
    }
    const expired = session.expiresAt !== undefined && session.expiresAt <= Date.now() + 60_000
    if (!session.tokens && method.flow === 'authorization_code') {
      throw new Error('Orca MCP 설정에서 브라우저 로그인을 진행해 주세요.')
    }
    if (
      !session.tokens ||
      expired ||
      (rejectedToken && rejectedToken === session.tokens.access_token)
    ) {
      const key = mcpConfigurationKey(server)
      if (this.pending.has(key)) {
        throw new Error('MCP 로그인이 진행 중입니다.')
      }
      let refresh = this.refreshes.get(key)
      if (!refresh) {
        const provider = new IntranetMcpOAuthProvider(
          server,
          session,
          this.writer(server, session),
          secret
        )
        refresh = auth(provider, {
          serverUrl: server.url,
          scope: method.scopes || undefined,
          fetchFn: intranetMcpOAuthFetch()
        }).then(() => {})
        this.refreshes.set(key, refresh)
      }
      try {
        await refresh
      } finally {
        if (this.refreshes.get(key) === refresh) {
          this.refreshes.delete(key)
        }
      }
      session = this.vault.read(server)
    }
    if (!session.tokens || session.tokens.token_type.toLowerCase() !== 'bearer') {
      throw new Error('Orca MCP 설정에서 다시 로그인해 주세요.')
    }
    return { Authorization: `Bearer ${session.tokens.access_token}` }
  }
}
