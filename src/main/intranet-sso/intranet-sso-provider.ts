import { createLocalJWKSet, jwtVerify } from 'jose'
import { z } from 'zod'
import type { IntranetSsoIdentity, IntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import {
  BADA_SSO_ISSUER,
  defaultIntranetSsoSettings,
  isIntranetSsoEndpoint
} from '../../shared/intranet/intranet-sso'
import { getMainHttpClient } from '../network/http-client'
import { assertIntranetRequest } from '../network/intranet-network'
import { readFetchResponseTextWithinLimit } from '../../shared/network/fetch-response-body'

export class IntranetSsoError extends Error {}
export type IntranetSsoFetch = (url: string, init?: RequestInit) => Promise<Response>
const JsonObject = z.record(z.string(), z.unknown())
const Metadata = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  jwks_uri: z.string(),
  userinfo_endpoint: z.string().optional(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional()
})
export type IntranetSsoProvider = {
  issuer: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  jwksUrl: string | null
}

export class IntranetSsoProviderClient {
  constructor(
    private readonly fetch: IntranetSsoFetch = (url, init) => getMainHttpClient().fetch(url, init),
    private readonly readSecret: (name: string) => string | undefined = (name) => process.env[name]
  ) {}

  assertCredentials(config: IntranetSsoSettings): void {
    if (config.tokenEndpointAuthMethod !== 'none' && !this.readSecret(config.clientSecretEnv)) {
      throw new IntranetSsoError('missing_client_secret')
    }
  }

  assertEndpoint(url: string): void {
    if (!url || !isIntranetSsoEndpoint(url)) {
      throw new IntranetSsoError('insecure_endpoint')
    }
    assertIntranetRequest(url)
  }

  async json(
    url: string,
    init: RequestInit,
    signal: AbortSignal
  ): Promise<Record<string, unknown>> {
    this.assertEndpoint(url)
    try {
      const response = await this.fetch(url, {
        ...init,
        redirect: 'error',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new IntranetSsoError('request_failed')
      }
      const text = await readFetchResponseTextWithinLimit(response, 256 * 1024)
      return JsonObject.parse(JSON.parse(text))
    } catch (error) {
      if (error instanceof IntranetSsoError) {
        throw error
      }
      throw new IntranetSsoError('request_failed')
    }
  }

  async discover(config: IntranetSsoSettings, signal: AbortSignal): Promise<IntranetSsoProvider> {
    if (config.protocol === 'oauth2') {
      const provider = {
        issuer: config.authorizationUrl,
        authorizationUrl: config.authorizationUrl,
        tokenUrl: config.tokenUrl,
        userInfoUrl: config.userInfoUrl,
        jwksUrl: null
      }
      for (const endpoint of [provider.authorizationUrl, provider.tokenUrl, provider.userInfoUrl]) {
        this.assertEndpoint(endpoint)
      }
      return provider
    }
    const issuer = config.issuer
    const raw = await this.json(
      `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
      {},
      signal
    )
    const parsed = Metadata.safeParse(raw)
    if (
      !parsed.success ||
      parsed.data.issuer !== issuer ||
      (parsed.data.code_challenge_methods_supported &&
        !parsed.data.code_challenge_methods_supported.includes('S256'))
    ) {
      throw new IntranetSsoError('invalid_metadata')
    }
    const metadata = parsed.data
    if (
      metadata.token_endpoint_auth_methods_supported &&
      !metadata.token_endpoint_auth_methods_supported.includes(config.tokenEndpointAuthMethod)
    ) {
      throw new IntranetSsoError('invalid_metadata')
    }
    if (issuer === BADA_SSO_ISSUER) {
      const bada = defaultIntranetSsoSettings()
      if (
        metadata.authorization_endpoint !== bada.authorizationUrl ||
        metadata.token_endpoint !== bada.tokenUrl ||
        (metadata.userinfo_endpoint && metadata.userinfo_endpoint !== bada.userInfoUrl) ||
        metadata.jwks_uri !== `${BADA_SSO_ISSUER}/.well-known/jwks.json`
      ) {
        throw new IntranetSsoError('invalid_metadata')
      }
    }
    for (const endpoint of [
      metadata.authorization_endpoint,
      metadata.token_endpoint,
      metadata.jwks_uri,
      ...(metadata.userinfo_endpoint ? [metadata.userinfo_endpoint] : [])
    ]) {
      this.assertEndpoint(endpoint)
    }
    return {
      issuer,
      authorizationUrl: metadata.authorization_endpoint,
      tokenUrl: metadata.token_endpoint,
      userInfoUrl: metadata.userinfo_endpoint ?? '',
      jwksUrl: metadata.jwks_uri
    }
  }

  async exchange(
    config: IntranetSsoSettings,
    provider: IntranetSsoProvider,
    input: { code: string; verifier: string; redirectUri: string; nonce: string },
    signal: AbortSignal
  ): Promise<IntranetSsoIdentity> {
    this.assertCredentials(config)
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json'
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      code_verifier: input.verifier,
      redirect_uri: input.redirectUri
    })
    if (config.tokenEndpointAuthMethod === 'client_secret_basic') {
      const encode = (value: string) => new URLSearchParams({ value }).toString().slice(6)
      headers.authorization = `Basic ${Buffer.from(
        `${encode(config.clientId)}:${encode(this.readSecret(config.clientSecretEnv)!)}`
      ).toString('base64')}`
    } else {
      body.set('client_id', config.clientId)
      if (config.tokenEndpointAuthMethod === 'client_secret_post') {
        body.set('client_secret', this.readSecret(config.clientSecretEnv)!)
      }
    }
    const raw = await this.json(
      provider.tokenUrl,
      {
        method: 'POST',
        headers,
        body: body.toString()
      },
      signal
    )
    const token = z
      .object({
        access_token: z.string().min(1).max(65536),
        token_type: z.string().toLowerCase().pipe(z.literal('bearer')),
        id_token: z.string().min(1).max(65536).optional(),
        expires_in: z.number().positive().finite().optional()
      })
      .safeParse(raw)
    if (!token.success) {
      throw new IntranetSsoError('invalid_token')
    }
    let profile: Record<string, unknown>
    let expiresAt: number
    if (config.protocol === 'oidc') {
      if (!token.data.id_token || !provider.jwksUrl) {
        throw new IntranetSsoError('invalid_token')
      }
      const keys = await this.json(provider.jwksUrl, {}, signal)
      try {
        const jwks = z
          .object({ keys: z.array(z.record(z.string(), z.unknown())).max(64) })
          .parse(keys)
        const { payload } = await jwtVerify(token.data.id_token, createLocalJWKSet(jwks), {
          issuer: provider.issuer,
          audience: config.clientId,
          algorithms:
            config.issuer === BADA_SSO_ISSUER
              ? ['RS256']
              : ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'EdDSA'],
          requiredClaims: ['sub', 'exp', 'iat', 'nonce'],
          clockTolerance: 30
        })
        if (
          payload.nonce !== input.nonce ||
          (payload.azp !== undefined && payload.azp !== config.clientId) ||
          (Array.isArray(payload.aud) &&
            payload.aud.length > 1 &&
            payload.azp !== config.clientId) ||
          typeof payload.iat !== 'number' ||
          payload.iat > Date.now() / 1000 + 30
        ) {
          throw new Error('claims')
        }
        profile = payload
        if (payload.exp! * 1000 <= Date.now()) {
          throw new Error('expired')
        }
        expiresAt = Math.min(payload.exp! * 1000, Date.now() + 24 * 60 * 60_000)
      } catch {
        throw new IntranetSsoError('invalid_token')
      }
      if (provider.userInfoUrl && (!profile.name || !profile.email)) {
        const userInfo = await this.json(
          provider.userInfoUrl,
          {
            headers: {
              authorization: `Bearer ${token.data.access_token}`,
              accept: 'application/json'
            }
          },
          signal
        )
        if (userInfo.sub !== profile.sub) {
          throw new IntranetSsoError('invalid_identity')
        }
        profile = {
          ...profile,
          name: profile.name ?? userInfo.name,
          email: profile.email ?? userInfo.email
        }
      }
    } else {
      profile = await this.json(
        provider.userInfoUrl,
        {
          headers: {
            authorization: `Bearer ${token.data.access_token}`,
            accept: 'application/json'
          }
        },
        signal
      )
      if (!token.data.expires_in) {
        throw new IntranetSsoError('invalid_token')
      }
      expiresAt = Date.now() + Math.min(token.data.expires_in, 24 * 60 * 60) * 1000
    }
    const rawSubject = profile[config.protocol === 'oidc' ? 'sub' : config.subjectClaim]
    const subject =
      config.protocol === 'oauth2' &&
      typeof rawSubject === 'number' &&
      Number.isSafeInteger(rawSubject)
        ? String(rawSubject)
        : rawSubject
    if (typeof subject !== 'string' || !subject || subject.length > 512) {
      throw new IntranetSsoError('invalid_identity')
    }
    const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 256) : null)
    return {
      issuer: provider.issuer,
      subject,
      name: text(profile.name),
      email: text(profile.email),
      expiresAt
    }
  }
}
