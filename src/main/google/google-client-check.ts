import type { GoogleClientConfig } from '../../shared/google/google-client-config'
import type { GoogleClientKeyState } from '../../shared/google/google-connect-types'
import type { GoogleHttp } from './google-token-endpoint'

export async function checkGoogleClientKey(
  _http: GoogleHttp,
  _client: Pick<GoogleClientConfig, 'clientId' | 'clientSecret'>
): Promise<GoogleClientKeyState> {
  throw new Error('This service is not included in the internal edition.')
}
