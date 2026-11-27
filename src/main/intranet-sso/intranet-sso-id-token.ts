import { createLocalJWKSet, jwtVerify } from 'jose'
import { z } from 'zod'
import { BADA_SSO_ISSUER, type IntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { IntranetSsoError } from './intranet-sso-error'

export async function verifyIntranetIdToken(
  config: IntranetSsoSettings,
  issuer: string,
  token: string,
  keys: Record<string, unknown>,
  expected: { nonce?: string; subject?: string }
): Promise<Record<string, unknown>> {
  try {
    const jwks = z.object({ keys: z.array(z.record(z.string(), z.unknown())).max(64) }).parse(keys)
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
      issuer: issuer,
      audience: config.clientId,
      algorithms:
        config.issuer === BADA_SSO_ISSUER
          ? ['RS256']
          : ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'EdDSA'],
      requiredClaims: ['sub', 'exp', 'iat', ...(expected.subject ? [] : ['nonce'])],
      clockTolerance: 30
    })
    if (
      ((expected.subject ? payload.nonce !== undefined : true) &&
        payload.nonce !== expected.nonce) ||
      (expected.subject !== undefined && payload.sub !== expected.subject) ||
      (payload.azp !== undefined && payload.azp !== config.clientId) ||
      (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId) ||
      typeof payload.iat !== 'number' ||
      payload.iat > Date.now() / 1000 + 30
    ) {
      throw new Error('claims')
    }
    if (payload.exp! * 1000 <= Date.now()) {
      throw new Error('expired')
    }
    return payload
  } catch {
    throw new IntranetSsoError('invalid_token')
  }
}
