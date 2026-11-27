import { discoverIntranetSsoProvider } from './intranet-sso-provider-discovery'
import { refreshIntranetSsoSession } from './intranet-sso-token-refresh'
import { z } from 'zod'
import type { IntranetSsoSession, IntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { isIntranetSsoEndpoint } from '../../shared/intranet/intranet-sso'
import { getMainHttpClient } from '../network/http-client'
import { assertIntranetRequest } from '../network/intranet-network'
import { readFetchResponseTextWithinLimit } from '../../shared/network/fetch-response-body'

import { IntranetSsoError } from './intranet-sso-error'
export { IntranetSsoError } from './intranet-sso-error'
import { verifyIntranetIdToken } from './intranet-sso-id-token'
import { assertIntranetSsoCredentials, intranetSsoTokenRequest } from './intranet-sso-token-request'
export type IntranetSsoFetch = (url: string, init?: RequestInit) => Promise<Response>
const JsonObject = z.record(z.string(), z.unknown())
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

  assertCredentials(config: IntranetSsoSettings, clientSecret?: string): void {
    assertIntranetSsoCredentials(config, clientSecret ?? this.readSecret(config.clientSecretEnv))
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
        const text = await readFetchResponseTextWithinLimit(response, 256 * 1024)
        if (response.status === 400) {
          try {
            if (JSON.parse(text)?.error === 'invalid_grant') {
              throw new IntranetSsoError('session_expired')
            }
          } catch (error) {
            if (error instanceof IntranetSsoError) {
              throw error
            }
          }
        }
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

  discover(config: IntranetSsoSettings, signal: AbortSignal): Promise<IntranetSsoProvider> {
    return discoverIntranetSsoProvider(this, config, signal)
  }

  async exchange(
    config: IntranetSsoSettings,
    provider: IntranetSsoProvider,
    input: {
      code: string
      verifier: string
      redirectUri: string
      nonce: string
      clientSecret?: string
    },
    signal: AbortSignal
  ): Promise<IntranetSsoSession> {
    const raw = await this.tokenRequest(
      config,
      provider,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: input.code,
        code_verifier: input.verifier,
        redirect_uri: input.redirectUri
      }),
      signal,
      input.clientSecret
    )
    const token = z
      .object({
        access_token: z.string().min(1).max(65536),
        token_type: z.string().toLowerCase().pipe(z.literal('bearer')),
        id_token: z.string().min(1).max(65536).optional(),
        refresh_token: z.string().min(1).max(65536).optional(),
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
      profile = await this.verifyIdToken(config, provider, token.data.id_token, signal, {
        nonce: input.nonce
      })
      expiresAt = Math.min(Number(profile.exp) * 1000, Date.now() + 24 * 60 * 60_000)
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
    const tokenExpiresAt = token.data.expires_in
      ? Math.min(expiresAt, Date.now() + token.data.expires_in * 1000)
      : expiresAt
    return {
      identity: {
        issuer: provider.issuer,
        subject,
        name: text(profile.name),
        email: text(profile.email),
        expiresAt: tokenExpiresAt
      },
      tokens: {
        accessToken: token.data.access_token,
        idToken: token.data.id_token ?? null,
        ...(token.data.refresh_token ? { refreshToken: token.data.refresh_token } : {}),
        expiresAt: tokenExpiresAt
      },
      nonce: input.nonce
    }
  }

  refresh(
    config: IntranetSsoSettings,
    session: IntranetSsoSession,
    signal: AbortSignal
  ): Promise<IntranetSsoSession> {
    return refreshIntranetSsoSession(
      this,
      config,
      session,
      signal,
      session.clientSecret ?? this.readSecret(config.clientSecretEnv)
    )
  }

  private async tokenRequest(
    config: IntranetSsoSettings,
    provider: IntranetSsoProvider,
    body: URLSearchParams,
    signal: AbortSignal,
    suppliedSecret?: string
  ) {
    return this.json(
      provider.tokenUrl,
      intranetSsoTokenRequest(
        config,
        body,
        suppliedSecret ?? this.readSecret(config.clientSecretEnv)
      ),
      signal
    )
  }

  private async verifyIdToken(
    config: IntranetSsoSettings,
    provider: IntranetSsoProvider,
    token: string,
    signal: AbortSignal,
    expected: { nonce?: string; subject?: string }
  ): Promise<Record<string, unknown>> {
    if (!provider.jwksUrl) {
      throw new IntranetSsoError('invalid_token')
    }
    return verifyIntranetIdToken(
      config,
      provider.issuer,
      token,
      await this.json(provider.jwksUrl, {}, signal),
      expected
    )
  }
}
