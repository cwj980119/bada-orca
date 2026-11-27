import { z } from 'zod'
import {
  BADA_SSO_ISSUER,
  defaultIntranetSsoSettings,
  type IntranetSsoSettings
} from '../../shared/intranet/intranet-sso'
import { IntranetSsoError } from './intranet-sso-error'
import type { IntranetSsoProvider, IntranetSsoProviderClient } from './intranet-sso-provider'

const Metadata = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  token_endpoint: z.string(),
  jwks_uri: z.string(),
  userinfo_endpoint: z.string().optional(),
  code_challenge_methods_supported: z.array(z.string()).optional(),
  token_endpoint_auth_methods_supported: z.array(z.string()).optional()
})

export async function discoverIntranetSsoProvider(
  client: Pick<IntranetSsoProviderClient, 'json' | 'assertEndpoint'>,
  config: IntranetSsoSettings,
  signal: AbortSignal
): Promise<IntranetSsoProvider> {
  if (config.protocol === 'oauth2') {
    const provider = {
      issuer: config.authorizationUrl,
      authorizationUrl: config.authorizationUrl,
      tokenUrl: config.tokenUrl,
      userInfoUrl: config.userInfoUrl,
      jwksUrl: null
    }
    for (const endpoint of [provider.authorizationUrl, provider.tokenUrl, provider.userInfoUrl]) {
      client.assertEndpoint(endpoint)
    }
    return provider
  }
  const issuer = config.issuer
  const raw = await client.json(
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
    client.assertEndpoint(endpoint)
  }
  return {
    issuer,
    authorizationUrl: metadata.authorization_endpoint,
    tokenUrl: metadata.token_endpoint,
    userInfoUrl: metadata.userinfo_endpoint ?? '',
    jwksUrl: metadata.jwks_uri
  }
}
