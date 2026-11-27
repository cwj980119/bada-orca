import type {
  OAuthClientProvider,
  OAuthDiscoveryState
} from '@modelcontextprotocol/sdk/client/auth.js'
import type {
  OAuthClientInformationMixed,
  OAuthTokens
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { effectiveMcpAuth } from '../../shared/intranet/intranet-mcp-auth'
import type { IntranetMcpServer } from '../../shared/intranet/intranet-resources'
import type { McpSession } from './intranet-mcp-vault'
import { assertMcpCredentialEndpoint } from './intranet-mcp-fetch'

export class IntranetMcpOAuthProvider implements OAuthClientProvider {
  private verifier = ''
  private readonly auth

  constructor(
    server: IntranetMcpServer,
    readonly session: McpSession,
    private readonly persist: () => void,
    private readonly secret: string | undefined,
    private readonly redirect?: (url: URL) => Promise<void>,
    private readonly oauthState = ''
  ) {
    const auth = effectiveMcpAuth(server)
    if (auth.type !== 'oauth') {
      throw new Error('OAuth 연결이 아닙니다.')
    }
    this.auth = auth
  }

  get redirectUrl() {
    return this.auth.flow === 'client_credentials' ? undefined : this.session.redirectUri
  }

  get clientMetadataUrl() {
    return this.auth.clientMetadataUrl || undefined
  }

  get clientMetadata() {
    return {
      client_name: 'Orca',
      redirect_uris: this.redirectUrl ? [this.redirectUrl] : [],
      grant_types:
        this.auth.flow === 'client_credentials'
          ? ['client_credentials']
          : ['authorization_code', 'refresh_token'],
      response_types: this.auth.flow === 'client_credentials' ? [] : ['code'],
      token_endpoint_auth_method: this.secret ? 'client_secret_post' : 'none',
      ...(this.auth.scopes ? { scope: this.auth.scopes } : {})
    }
  }

  state() {
    return this.oauthState
  }

  prepareTokenRequest(scope?: string): URLSearchParams | undefined {
    return this.auth.flow === 'client_credentials'
      ? new URLSearchParams({ grant_type: 'client_credentials', ...(scope ? { scope } : {}) })
      : undefined
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    if (this.auth.clientId) {
      return {
        client_id: this.auth.clientId,
        ...(this.session.client?.issuer ? { issuer: this.session.client.issuer } : {}),
        ...(this.secret ? { client_secret: this.secret } : {})
      }
    }
    return this.session.client
  }

  saveClientInformation(client: OAuthClientInformationMixed) {
    this.session.client = client
    this.persist()
  }

  tokens() {
    return this.session.tokens
  }

  saveTokens(tokens: OAuthTokens) {
    const previous = this.session.tokens
    this.session.tokens = {
      ...tokens,
      ...(!tokens.refresh_token &&
      previous &&
      previous.issuer === tokens.issuer &&
      previous.refresh_token
        ? { refresh_token: previous.refresh_token }
        : {})
    }
    this.session.expiresAt =
      tokens.expires_in === undefined ? undefined : Date.now() + tokens.expires_in * 1000
    this.persist()
  }

  async redirectToAuthorization(url: URL) {
    assertMcpCredentialEndpoint(url.href)
    if (!this.redirect) {
      throw new Error('Orca의 MCP 설정에서 브라우저 로그인을 진행해 주세요.')
    }
    await this.redirect(url)
  }

  saveCodeVerifier(verifier: string) {
    this.verifier = verifier
  }
  codeVerifier() {
    return this.verifier
  }
  discoveryState() {
    return (
      this.session.discovery ??
      (this.auth.issuer ? { authorizationServerUrl: this.auth.issuer } : undefined)
    )
  }
  saveDiscoveryState(state: OAuthDiscoveryState) {
    const issuer = state.authorizationServerMetadata?.issuer
    if (issuer && new URL(issuer).href !== new URL(state.authorizationServerUrl).href) {
      throw new Error('OAuth 발급자와 인증 서버 주소가 일치하지 않습니다.')
    }
    this.session.discovery = state
    this.persist()
  }

  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') {
      delete this.session.client
    }
    if (scope === 'all' || scope === 'tokens') {
      delete this.session.tokens
      delete this.session.expiresAt
    }
    if (scope === 'all' || scope === 'discovery') {
      delete this.session.discovery
    }
    if (scope === 'all' || scope === 'verifier') {
      this.verifier = ''
    }
    this.persist()
  }
}
