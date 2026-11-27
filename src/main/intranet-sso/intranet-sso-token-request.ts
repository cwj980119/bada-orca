import type { IntranetSsoSettings } from '../../shared/intranet/intranet-sso'
import { IntranetSsoError } from './intranet-sso-error'

export function assertIntranetSsoCredentials(
  config: IntranetSsoSettings,
  clientSecret?: string
): void {
  if (config.tokenEndpointAuthMethod !== 'none' && !clientSecret) {
    throw new IntranetSsoError('missing_client_secret')
  }
}

export function intranetSsoTokenRequest(
  config: IntranetSsoSettings,
  body: URLSearchParams,
  clientSecret?: string
): RequestInit {
  assertIntranetSsoCredentials(config, clientSecret)
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
    accept: 'application/json'
  }
  if (config.tokenEndpointAuthMethod === 'client_secret_basic') {
    const encode = (value: string) => new URLSearchParams({ value }).toString().slice(6)
    headers.authorization = `Basic ${Buffer.from(
      `${encode(config.clientId)}:${encode(clientSecret!)}`
    ).toString('base64')}`
  } else {
    body.set('client_id', config.clientId)
    if (config.tokenEndpointAuthMethod === 'client_secret_post') {
      body.set('client_secret', clientSecret!)
    }
  }

  return { method: 'POST', headers, body: body.toString() }
}
