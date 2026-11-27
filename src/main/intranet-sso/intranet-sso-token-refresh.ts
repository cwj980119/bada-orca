import { z } from 'zod'
import type { IntranetSsoSession, IntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import type { IntranetSsoProviderClient } from './intranet-sso-provider'
import { IntranetSsoError } from './intranet-sso-error'
import { intranetSsoTokenRequest } from './intranet-sso-token-request'
import { verifyIntranetIdToken } from './intranet-sso-id-token'

export async function refreshIntranetSsoSession(
  client: Pick<IntranetSsoProviderClient, 'discover' | 'json'>,
  config: IntranetSsoSettings,
  session: IntranetSsoSession,
  signal: AbortSignal,
  clientSecret?: string
): Promise<IntranetSsoSession> {
  if (!session.tokens?.refreshToken) {
    throw new IntranetSsoError('session_expired')
  }
  const provider = await client.discover(config, signal)
  const raw = await client.json(
    provider.tokenUrl,
    intranetSsoTokenRequest(
      config,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.tokens.refreshToken
      }),
      clientSecret
    ),
    signal
  )
  const token = z
    .object({
      access_token: z.string().min(1).max(65536),
      token_type: z.string().toLowerCase().pipe(z.literal('bearer')),
      expires_in: z.number().positive().finite(),
      refresh_token: z.string().min(1).max(65536).optional(),
      id_token: z.string().min(1).max(65536).optional()
    })
    .safeParse(raw)
  if (!token.success) {
    throw new IntranetSsoError('invalid_token')
  }
  if (config.protocol === 'oidc' && token.data.id_token) {
    if (!provider.jwksUrl) {
      throw new IntranetSsoError('invalid_token')
    }
    await verifyIntranetIdToken(
      config,
      provider.issuer,
      token.data.id_token,
      await client.json(provider.jwksUrl, {}, signal),
      { subject: session.identity.subject, nonce: session.nonce }
    )
  }
  const expiresAt = Date.now() + Math.min(token.data.expires_in, 24 * 60 * 60) * 1000
  return {
    ...session,
    identity: { ...session.identity, expiresAt },
    tokens: {
      accessToken: token.data.access_token,
      idToken: token.data.id_token ?? null,
      refreshToken: token.data.refresh_token ?? session.tokens.refreshToken,
      expiresAt
    }
  }
}
