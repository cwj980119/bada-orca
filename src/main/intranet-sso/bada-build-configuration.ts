import { defaultIntranetSsoSettings } from '../../shared/intranet/intranet-sso'

export function badaBuildClientSecret(): string {
  return typeof BADA_CLIENT_SECRET === 'string' ? BADA_CLIENT_SECRET : ''
}

export function badaBuildSettings() {
  return {
    ...defaultIntranetSsoSettings(),
    clientId: typeof BADA_CLIENT_ID === 'string' ? BADA_CLIENT_ID : 'orca',
    enabled: Boolean(badaBuildClientSecret())
  }
}
